import { _decorator, Component, Enum, UITransform, Size, Vec2, v2, View, view, Director, director, size, Node } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, requireComponent } = _decorator;

interface SizeParameters {
    selfSize: Size;
    parentSize: Size;
    viewSize: Size;
}

enum PositionType {
    OriginalPosition,
    RelativeToParent,
    Absolute
}

enum ResizeMode {
    OriginalSize,
    ResizeByProps,
    ResizeByWidth,
    ResizeByHeight
}

@ccclass('ResizePreset')
class ResizePreset {
    @property({ 
        type: Enum(ResizeMode),
        tooltip: `OriginalSize - node size will remain unchanged
            ResizeByProps - width and height will be calculated based on the settings below 
            ResizeByWidth - width will be calculated based on the settings below, height will be proportional to width 
            ResizeByHeight - height will be calculated based on the settings below, width will be proportional to height ` 
    })
    public resizeMode: ResizeMode = ResizeMode.OriginalSize;

    @property({
		visible: function(this: ResizePreset) { return this.resizeMode !== ResizeMode.ResizeByHeight && this.resizeMode !== ResizeMode.OriginalSize },
        tooltip: `Use +, -, *, / operands to manipulate dimensions below\n
            px - pixels
            pw - parent width (percentage)
            ph - parent height (percentage)
            vw - view width (percentage)
            vh - view height (percentage)`
    })
    get width() { return this._width }
    set width(value: string) {
        this._width = this._validateInputString(value);
    }
    @property({
		visible: function(this: ResizePreset) { return this.resizeMode !== ResizeMode.ResizeByWidth && this.resizeMode !== ResizeMode.OriginalSize },
        tooltip: `Use +, -, *, / operands to manipulate dimensions below\n
            px - pixels
            pw - parent width (percentage)
            ph - parent height (percentage)
            vw - view width (percentage)
            vh - view height (percentage)`
    })
    get height() { return this._height }
    set height(value: string) {
        this._height = this._validateInputString(value);
    }
    
    @property({ 
        type: Enum(PositionType),
        tooltip: `OriginalPosition - node position will remain unchanged
            RelativeToParent - position will be calculated from parent center
            Absolute - position will be calculated from left-bottom angle of screen` 
    })
    public positionType: PositionType = PositionType.OriginalPosition;
    @property({
        visible: function(this: ResizePreset) { return this.positionType !== PositionType.OriginalPosition },
        tooltip: `Use +, -, *, / operands to manipulate dimensions below\n
            px - pixels
            sw - self width (percentage)
            sh - self height (percentage)
            pw - parent width (percentage)
            ph - parent height (percentage)
            vw - view width (percentage)
            vh - view height (percentage)`
    })
    get x() { return this._x }
    set x(value: string) {
        this._x = this._validateInputString(value, true);
    }
    @property({
        visible: function(this: ResizePreset) { return this.positionType !== PositionType.OriginalPosition },
        tooltip: `Use +, -, *, / operands to manipulate dimensions below\n
            px - pixels
            sw - self width (percentage)
            sh - self height (percentage)
            pw - parent width (percentage)
            ph - parent height (percentage)
            vw - view width (percentage)
            vh - view height (percentage)`
    })
    get y() { return this._y }
    set y(value: string) {
        this._y = this._validateInputString(value, true);
    }

    @property
    private _width: string = '0px';
    @property
    private _height: string = '0px';
    @property
    private _x: string = '0px';
    @property
    private _y: string = '0px';

    _validateInputString(value: string, withSelfDimensions: boolean = false): string {
        let isValid = false;
        
        if (withSelfDimensions) {
            isValid = /^(\d|px|sw|sh|pw|ph|vw|vh|\-|\+|\*|\/|\.|\s|\(|\))+$/gm.test(value);
        } else {
            isValid = /^(\d|px|pw|ph|vw|vh|\-|\+|\*|\/|\.|\s|\(|\))+$/gm.test(value);
        }

        if (isValid) {
            let bracketCount = 0;
            for (let i = 0; i < value.length; ++i) {
                switch(value[i]) {
                    case '(': 
                        bracketCount++;
                        break;
                    case ')': 
                        bracketCount--;
                        break;
                }

                if (bracketCount < 0) {
                    isValid = false;
                    break;
                }
            }

            isValid = bracketCount === 0;
        }
        
        return isValid ? value.replace(/\s/g, '') : '0px';
    }

    _fillDimensions(input: string, params: SizeParameters): string {
        let output = input;

        output = output.replace(/px/g, '');
        output = output.replace(/sw/g, `/100*${params.selfSize.width}`);
        output = output.replace(/sh/g, `/100*${params.selfSize.height}`);
        output = output.replace(/pw/g, `/100*${params.parentSize.width}`);
        output = output.replace(/ph/g, `/100*${params.parentSize.height}`);
        output = output.replace(/vw/g, `/100*${params.viewSize.width}`);
        output = output.replace(/vh/g, `/100*${params.viewSize.height}`);

        return output;
    }

    getContentSize(params: SizeParameters) {
        const wFunc = this._fillDimensions(this.width, params);
        const hFunc = this._fillDimensions(this.height, params);

        return size(eval(wFunc), eval(hFunc));
    }

    getPosition(params: SizeParameters) { 
        const xFunc = this._fillDimensions(this.x, params);
        const yFunc = this._fillDimensions(this.y, params);

        return v2(eval(xFunc), eval(yFunc));
    }
}

@ccclass('ResizeMap')
class ResizeMap {
    @property({
        tooltip: 'If the size ratio is greater than this value and less than the next, these settings will be used'
    })
    public sizeRatio: number = 0;
    @property({
        tooltip: 'If TRUE the node will be resized using scale rather than changing content size'
    })
    public resizeByScale: boolean = false;
    @property({ 
        type: ResizePreset,
        tooltip: 'Settings for landscape orientation'
    })
    public landscape: ResizePreset = new ResizePreset();
    @property({ 
        type: ResizePreset,
        tooltip: 'Settings for portrait orientation' 
    })
    public portrait: ResizePreset = new ResizePreset();
}

@ccclass('TransformAdapter')
@requireComponent(UITransform)
export class TransformAdapter extends Component {
    @property
    get tryInEditor(): boolean {
        return false;
    }
    set tryInEditor(value: boolean) {
        if (EDITOR) {
            this._fillPrivateProps();
            this.onTransformEvent();
        }
    }

    @property({ type: [ResizeMap] })
    public settings: ResizeMap[] = [];

    private _transform: UITransform = null;
    private _originalSize: Size = null;
    private _parentSize: Size = null;

    onLoad() {
        this._fillPrivateProps();
        this._handleResizeEvents(true);
    }

    _handleResizeEvents(isOn: boolean) {
        const func = isOn ? 'on' : 'off';

        // director[func](Director.EVENT_AFTER_SCENE_LAUNCH, this.onTransformEvent, this);
        director[func](Director.EVENT_AFTER_UPDATE, this.onTransformEvent, this);

        // View.instance[func]('design-resolution-changed', this.onTransformEvent, this);
    }

    _getTargetMap(ratio: number): ResizeMap {
        return this.settings
            .sort((a, b) => a.sizeRatio - b.sizeRatio)
            .find((map: ResizeMap) => map.sizeRatio < ratio);
    }

    _fillPrivateProps() {
        this._transform = this.getComponent(UITransform);
        this._originalSize = this._transform.contentSize;

        let parent: Node = this.node.parent;
        while(parent && !this._parentSize) {
            const parentTransform: UITransform = parent.getComponent(UITransform);
            if (parentTransform) {
                this._parentSize = parentTransform.contentSize;
            } else {
                parent = parent.parent;
            }
        }
    }

    onTransformEvent() {
        const viewSize: Size = view.getVisibleSize();
        const parentSize: Size = this._parentSize ? this._parentSize : viewSize.clone();
        const params: SizeParameters = { viewSize, parentSize, selfSize: size(0, 0) };
        
        const isHorizontal: boolean = viewSize.width > viewSize.height;
        const sizeRatio: number = Math.max(viewSize.width / viewSize.height, viewSize.height / viewSize.width);

        const map: ResizeMap = this._getTargetMap(sizeRatio);
        if (map) {
            const preset: ResizePreset = map[isHorizontal ? 'landscape' : 'portrait'];
            
            if (preset.resizeMode !== ResizeMode.OriginalSize) {
                // operate size
                const contentSize: Size = preset.getContentSize(params);  
                switch(preset.resizeMode) {
                    case ResizeMode.ResizeByWidth: {
                        contentSize.height = this._originalSize.height / this._originalSize.width * contentSize.width;
                        break;
                    }
                    case ResizeMode.ResizeByHeight: {
                        contentSize.width = this._originalSize.width / this._originalSize.height * contentSize.height;
                        break;
                    }
                }

                if (map.resizeByScale) {
                    this.node.setScale(
                        contentSize.width / this._originalSize.width,
                        contentSize.height / this._originalSize.height
                    );
                } else {
                    this._transform.setContentSize(contentSize.width, contentSize.height);
                }
            }
            
            if (preset.positionType !== PositionType.OriginalPosition) {
                // operate position
                params.selfSize = size(
                    this._transform.contentSize.width * this.node.scale.x,
                    this._transform.contentSize.height * this.node.scale.y
                );
                const position = preset.getPosition(params); 
                
                if (preset.positionType === PositionType.RelativeToParent) {
                    if (this.node.parent) {
                        position.x += this.node.parent.worldPosition.x;
                        position.y += this.node.parent.worldPosition.y;
                    }
                }
                this.node.setWorldPosition(position.x, position.y, 0);
            }
        }
    }
}


