import { _decorator, Graphics, TextAsset, Color, v2, Vec2, UITransform, CCObject, warn, log, Size, size, EventTarget } from 'cc';
import { EDITOR } from 'cc/env';
import { PathParser } from './PathParser';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

const svGraphicsEventTarget: EventTarget = new EventTarget();
enum SVGraphicsEventType {
    GRAPHICS_CLEARED,
    GRAPHICS_PARSED,
    GRAPHICS_RENDERED,
    GRAPHICS_DRAWN,
    GRAPHICS_ERASED,
    INVALID_SVG_PLOT
}

interface DrawSettings {
    fillColor: Color,
    strokeColor: Color,
    lineWidth: number,
    needStroke: boolean,
    needFill: boolean
}

interface DrawElement {
    points: Vec2[],
    length: number,
    settings: DrawSettings
}

class RectLimits {
    private left: number;
    private right: number;
    private bottom: number;
    private top: number;

    get contentSize(): Size {
        return size(this.right - this.left, this.top - this.bottom);
    }

    get anchorPoint(): Vec2 {
        const size = this.contentSize;
        const center = v2(this.left + size.width / 2, this.bottom + size.height / 2);
        return v2(0.5 - center.x / size.width, 0.5 - center.y / size.height);
    }

    constructor() {
        this.left = Infinity;
        this.bottom = Infinity;
        this.right = -Infinity;
        this.top = -Infinity;
    }

    public processPoint(point: Vec2) {
        this.left = Math.min(this.left, point.x);
        this.right = Math.max(this.right, point.x);
        this.bottom = Math.min(this.bottom, point.y);
        this.top = Math.max(this.top, point.y);
    }
}

@ccclass('SVGraphics')
@executeInEditMode
@requireComponent(UITransform)
export class SVGraphics extends Graphics {
    public static eventTarget: EventTarget = svGraphicsEventTarget;
    public static EventType: typeof SVGraphicsEventType = SVGraphicsEventType;

    @property({ 
        type: TextAsset,
        tooltip: 'SVG file that needs to be rendered previously saved in TXT format'
    })
    get svgFile(): TextAsset {
        return this._svgFile;
    }
    set svgFile(value: TextAsset) {
        this._svgFile = value;
        if (this._svgFile) {
            this._svgFile.hideFlags = CCObject.Flags.EditorOnly;
        }

        this.recompileGraphics();
    }
    @property({ 
        min: 0.1, 
        max: 1, 
        step: 0.1, 
        slide: true,
        tooltip: `Rendering quality threshold. The higher, the more accurately the graphics will be drawn. 
            But the number of points for drawing will also be higher` 
    })
    get threshold(): number{
        return this._threshold;
    }
    set threshold(value: number){
        this._threshold = value;

        this.recompileGraphics();
    }
    @property({ 
        tooltip: `Property used to animate the appearance of graphics. Change it from the animation timeline.
            Value from 0 to 0.5 are used to draw strokes, values from 0.5 to 1 are used to fill shapes. 
            Do not forget to call the function "startAppearance" at the beginning of changing this property. 
            And call the function "stopAppearance" at the end of changing it.
            Leave the property set to 1 if you don't need to animate graphics appearance.
            Change "Line Width" property to change width of stroke in drawing animation.`
    })
    public appearanceProgress: number = 1;
    @property({
        tooltip: `Use this to redraw the graphics in the editor. 
            Especially if you have changed the properties above the "Svg File" property`
    })
    get recompileInEditor(): boolean {
        return false;
    }
    set recompileInEditor(value: boolean) {
        this.recompileGraphics();
    }

    @property
    private _svgFile: TextAsset = null;
    @property
    private _threshold: number = 1;
    @property
    private _drawElements: DrawElement[] = [];

    private _defaultFillColor: Color = null;
    private _defaultStrokeColor: Color = null;
    private _defaultLineWidth: number = null;

    private _updateFunc: Function = null;
    private _rectLimits: RectLimits = null;


    start() {
        this.stopAppearance();
        if (!EDITOR) {
            this._setDefaultProperties();
            this._clearGraphics();
            this._renderGraphics();

            // window.DEBUG = this;
        }
    }

    update(deltaTime: number) {
        this._updateFunc(deltaTime);
    }

    startAppearance() {
        this._updateFunc = (deltaTime: number) => {
            this._renderGraphics();
        }
    }

    stopAppearance() {
        this._updateFunc = (deltaTime: number) => {};
        if (this.appearanceProgress === 0) {
            svGraphicsEventTarget.emit(SVGraphicsEventType.GRAPHICS_ERASED);
        } else {
            svGraphicsEventTarget.emit(SVGraphicsEventType.GRAPHICS_DRAWN);
        }
    }

    parseSVG(svgPlot: string) {
        this._setDefaultProperties();

        const parser = new DOMParser();
        const svgBody = parser.parseFromString(svgPlot, 'text/html').querySelector('svg');

        if (svgBody) {
            this._rectLimits = new RectLimits();

            const svg = document.createElement('div');
            svg.style.visibility = 'hidden';
            svg.appendChild(svgBody);
            document.body.appendChild(svg);

            this._processSVGTree(svg);

            svg.remove();
            this._setTransformProps();

            svGraphicsEventTarget.emit(SVGraphicsEventType.GRAPHICS_PARSED);
        } else {
            warn('This asset is not SVG file.');
            svGraphicsEventTarget.emit(SVGraphicsEventType.INVALID_SVG_PLOT);
        }
    }

    recompileGraphics(svgPlot?: string) {
        this._clearGraphics();
        this._drawElements = [];

        const uiTransform: UITransform = this.getComponent(UITransform);
        uiTransform.setContentSize(0, 0);
        uiTransform.setAnchorPoint(0.5, 0.5);

        if (svgPlot || this._svgFile) {
            this.parseSVG(svgPlot || this._svgFile.text);
            this._renderGraphics(EDITOR ? 1 : this.appearanceProgress);

            this.fillColor = this._defaultFillColor;
            this.strokeColor = this._defaultStrokeColor;
            this.lineWidth = this._defaultLineWidth;

            if (EDITOR) {
                log('SVG successfully compiled');
            }
        }
    }

    private _processSVGTree(element: HTMLElement | SVGElement) {
        for (let i = 0; i < element.childNodes.length; ++i) {
            const node = element.childNodes[i];

            if (node instanceof SVGDefsElement) continue;
            if (node instanceof SVGGeometryElement || node instanceof SVGGraphicsElement) {
                this._createDrawElement(node);
            }

            this._processSVGTree(node as SVGElement);
        }
    }

    private _createDrawElement(element: SVGElement) {
        const settings: DrawSettings = this._getDrawSettings(element);
        const transform: DOMMatrix = (element as SVGGraphicsElement).getCTM();
        switch(true) {
            case (element instanceof SVGPolygonElement):
            case (element instanceof SVGRectElement): 
            case (element instanceof SVGCircleElement): 
            case (element instanceof SVGEllipseElement): {
                const path = this._convertElementToPath(element);
                this._createFromPath(path as SVGPathElement, settings, transform, true);
            } break;
            case (element instanceof SVGPolylineElement):
            case (element instanceof SVGLineElement): {
                const path = this._convertElementToPath(element);
                this._createFromPath(path as SVGPathElement, settings, transform);
            } break;
            case (element instanceof SVGPathElement): {
                const paths: SVGPathElement[] = PathParser.splitPaths(element.getAttribute('d'));
                paths.forEach((path: SVGPathElement) => {
                    this._createFromPath(path, settings, transform, false);
                });
            } break;
        }
    }

    private _convertElementToPath(element: SVGElement) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        switch(true) {
            case (element instanceof SVGPolygonElement):
            case (element instanceof SVGPolylineElement): {
                path.setAttribute('d', `M${element.getAttribute('points')}`);
            } break;
            case (element instanceof SVGCircleElement): {
                const data = {
                    cx: (element as SVGCircleElement).cx.baseVal.value | 0,
                    cy: (element as SVGCircleElement).cy.baseVal.value | 0,
                    r: (element as SVGCircleElement).r.baseVal.value | 0,
                };
                path.setAttribute('d', `M${data.cx - data.r} ${data.cy} 
                    a ${data.r} ${data.r} 0 1 0 ${data.r * 2} 0 
                    a ${data.r} ${data.r} 0 1 0 ${-data.r * 2} 0`);
            } break;
            case (element instanceof SVGEllipseElement): {
                const data = {
                    cx: (element as SVGEllipseElement).cx.baseVal.value | 0,
                    cy: (element as SVGEllipseElement).cy.baseVal.value | 0,
                    rx: (element as SVGEllipseElement).rx.baseVal.value | 0,
                    ry: (element as SVGEllipseElement).ry.baseVal.value | 0,
                };
                path.setAttribute('d', `M${data.cx - data.rx} ${data.cy} 
                    a ${data.rx} ${data.ry} 0 1 0 ${data.rx * 2} 0 
                    a ${data.rx} ${data.ry} 0 1 0 ${-data.rx * 2} 0`);
            } break;
            case (element instanceof SVGRectElement): {
                const data = {
                    x: (element as SVGRectElement).x.baseVal.value | 0,
                    y: (element as SVGRectElement).y.baseVal.value | 0,
                    width: (element as SVGRectElement).width.baseVal.value | 0,
                    height: (element as SVGRectElement).height.baseVal.value | 0,
                    rx: (element as SVGRectElement).rx.baseVal.value | 0,
                    ry: (element as SVGRectElement).ry.baseVal.value | 0,
                };
                path.setAttribute('d', `M${data.x + data.rx} ${data.y} 
                    h${data.width - data.rx * 2} s${data.rx} 0 ${data.rx} ${data.ry}
                    v${data.height - data.ry * 2} s0 ${data.ry} ${-data.rx} ${data.ry}
                    h${-(data.width - data.rx * 2)} s${-data.rx} 0 ${-data.rx} ${-data.ry}
                    v${-(data.height - data.ry * 2)} s0 ${-data.ry} ${data.rx} ${-data.ry}`);
            } break;
            case (element instanceof SVGLineElement): {
                const data = {
                    x1: (element as SVGLineElement).x1.baseVal.value | 0,
                    y1: (element as SVGLineElement).y1.baseVal.value | 0,
                    x2: (element as SVGLineElement).x2.baseVal.value | 0,
                    y2: (element as SVGLineElement).y2.baseVal.value | 0,
                };
                path.setAttribute('d', `M${data.x1} ${data.y1} L${data.x2} ${data.y2}`);
            } break;
        }

        return path;
    }

    private _createFromPath(data: SVGPathElement, settings: DrawSettings, transform: DOMMatrix, closeShape = false, matrix = null) {
        if (closeShape && data.hasAttribute('d')) { 
            const d = data.getAttribute('d').trim();
            if (d.substring(d.length - 1).toLowerCase() !== 'z') {
                data.setAttribute('d', `${d}z`);
            }
        }

        const length = data.getTotalLength();
        if (length > 0) {
            const stepCount = Math.floor(length * this.threshold);
            const step = length / stepCount;
            const points: Vec2[] = [];

            for (let i = 0; i <= stepCount; ++i) {
                const point: SVGPoint = data.getPointAtLength(i * step);
                const absPoint: SVGPoint = point.matrixTransform(transform);

                this._rectLimits.processPoint(v2(absPoint.x, -absPoint.y));
                points.push(v2(absPoint.x, -absPoint.y));
            }

            if (closeShape) {
                const point: SVGPoint = data.getPointAtLength(0);
                const absPoint: SVGPoint = point.matrixTransform(transform);

                this._rectLimits.processPoint(v2(absPoint.x, -absPoint.y));
                points.push(v2(absPoint.x, -absPoint.y));
            }    
            
            const drawElement: DrawElement = {
                points: points,
                length: points.length,
                settings
            };

            this._drawElements.push(drawElement);
        }
    }

    private _getDrawSettings(data: SVGElement): DrawSettings {
        const settings: DrawSettings = {
            fillColor: this._defaultFillColor,
            strokeColor: this._defaultStrokeColor,
            lineWidth: this._defaultLineWidth,
            needStroke: false,
            needFill: true
        }

        const style: Map<string, string> = this._getStyleMap(data);

        let opacity = 1;
        if (style.has('opacity')) {
            opacity = +style.get('opacity');
        }

        // calculate fill settings
        if (style.has('fill')) {
            if (style.has('fill-opacity')) {
                opacity = Math.min(opacity, +style.get('fill-opacity'));
            }
            settings.fillColor = this._getColor(style.get('fill'), opacity, settings.fillColor);
        }
        settings.needFill = settings.fillColor.a > 0;

        // calculate stroke settings
        if (style.has('stroke')) {
            if (style.has('stroke-opacity')) {
                opacity = Math.min(opacity, +style.get('stroke-opacity'));
            }
            settings.strokeColor = this._getColor(style.get('stroke'), opacity, settings.strokeColor);

            if (style.has('stroke-width')) {
                settings.lineWidth = +style.get('stroke-width');
            }  
            
            settings.needStroke = settings.strokeColor.a > 0;
        }

        return settings;
    }

    private _getStyleMap(data: SVGElement): Map<string, string> {
        const style = new Map();

        const targetRules: string[] = ['fill', 'stroke', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-width'];
        const colorRules: string[] = ['fill', 'stroke'];

        const rules = window.getComputedStyle(data);
        targetRules.forEach((name: string) => {
            let value = rules[name];
            if (colorRules.indexOf(name) < 0) {
                value = value.replace(/[^\d\-\.]/g, '');
            }
            style.set(name, value);
        });

        return style;
    }

    private _getColor(color: string, opacity: number, defaultColor: Color): Color {
        let resultColor = defaultColor.clone();
        let clearColorStr = color.trim();

        if (clearColorStr[0] === '#') {
            let hexColor = clearColorStr;
            if (clearColorStr.length < 7) {
                hexColor = '#';
                for (let i = 1; i < clearColorStr.length; ++i) {
                    hexColor += clearColorStr[i] + clearColorStr[i];
                }
            }

            Color.fromHEX(resultColor, hexColor);
        } else if (clearColorStr.substring(0, 3) === 'rgb') {
            const colArray = color.replace(/[^\d\,]/g, '').split(',').map(el => +el);
            if (colArray.length > 3) {
                resultColor = new Color(colArray[0], colArray[1], colArray[2], colArray[3]);
            } else {
                resultColor = new Color(colArray[0], colArray[1], colArray[2]);
            }
        } else if (clearColorStr === 'transparent' || clearColorStr === 'none') {
            resultColor = new Color(0, 0, 0, 0);
        } else if (Color[color.toUpperCase()]) {
            resultColor = Color[color.toUpperCase()];
        }

        resultColor = this._setColorAlpha(resultColor, opacity);

        return resultColor;
    }

    private _setDefaultProperties() {
        if (this._defaultLineWidth === null) {
            this._defaultFillColor = this.fillColor.clone();
            this._defaultStrokeColor = this.strokeColor.clone();
            this._defaultLineWidth = this.lineWidth;
        }
    }

    private _setTransformProps() {
        const uiTransform: UITransform = this.getComponent(UITransform);
        
        const viewSize = this._rectLimits.contentSize;
        const viewAnchor = this._rectLimits.anchorPoint;

        uiTransform.setContentSize(viewSize.width, viewSize.height);
        uiTransform.setAnchorPoint(viewAnchor.x, viewAnchor.y);
    }

    private _setColorAlpha(color: Color, alpha: number): Color {
        return new Color(color.r, color.g, color.b, color.a * alpha);
    }

    private _clearGraphics() {
        this.clear();
        svGraphicsEventTarget.emit(SVGraphicsEventType.GRAPHICS_CLEARED);
    }

    private _renderGraphics(forceProgress?: number) {
        this._clearGraphics();

        const appearanceProgress: number = (forceProgress || this.appearanceProgress);
        const strokeProgress: number = Math.min(1, appearanceProgress * 2);
        
        this._drawElements
            .forEach((el: DrawElement) => {
                this.moveTo(el.points[0].x, el.points[0].y);
                const limit = el.length * strokeProgress;
                for (let i = 1; i < limit; ++i) {
                    this.lineTo(el.points[i].x, el.points[i].y);
                }

                this._finishDraw(el.settings, appearanceProgress);
            });

        svGraphicsEventTarget.emit(SVGraphicsEventType.GRAPHICS_RENDERED);
    }

    private _finishDraw(settings: DrawSettings, appearanceProgress: number) {
        let fillColor = settings.fillColor;
        let strokeColor = settings.strokeColor;
        let lineWidth = settings.lineWidth;
        let needFill = settings.needFill;
        let needStroke = settings.needStroke;

        if (appearanceProgress < 1) {
            strokeColor = fillColor;

            if (appearanceProgress < 0.5) {
                needFill = false;
                lineWidth = this._defaultLineWidth;
            } else {
                needFill = true;
                fillColor = this._setColorAlpha(fillColor, Math.max(0, appearanceProgress - 0.5) * 2);
                lineWidth = Math.max(this._defaultLineWidth * (1 - appearanceProgress) * 2, lineWidth);
            }

            needStroke = true;
        }

        this.fillColor = fillColor;
        this.strokeColor = strokeColor;
        this.lineWidth = lineWidth;

        needStroke && this.stroke();
        needFill && this.fill();
    }
}


