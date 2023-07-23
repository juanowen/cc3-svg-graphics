import { _decorator, Component, Label, EditBox, Color } from 'cc';
import { ScreenButton } from './ScreenButton';
import { AnimationToggler } from '../AnimationToggler';
import { SVGraphics } from '../SVGraphics';
import { ImageSwitcher } from '../ImageSwitcher';
const { ccclass, property } = _decorator;

@ccclass('FetchButton')
export class FetchButton extends ScreenButton {
    @property({ type: Label })
    public loadingLabel: Label = null;

    private _svgPath: string = '';

    onTouchStart() { 
        super.onTouchStart();

        this._svgPath = prompt('Enter SVG url here', 'https://url_to_any/svg_file.svg');
        if (this._svgPath) {
            this._svgPath = this._svgPath.trim();
            const svgPathArray = this._svgPath.split('.');
            
            if (svgPathArray[svgPathArray.length - 1] === 'svg') {
                AnimationToggler.eventTarget.emit(AnimationToggler.EventType.ANIMATION_SWITCH_OFF);
                SVGraphics.eventTarget.on(SVGraphics.EventType.GRAPHICS_ERASED, this.onGraphicsErased, this);
            }
        }

        this.onTouchEnd();
    }

    onGraphicsErased() {
        SVGraphics.eventTarget.off(SVGraphics.EventType.GRAPHICS_ERASED, this.onGraphicsErased, this);

        if (this.loadingLabel) {
            this.loadingLabel.color = new Color(0, 0, 0, 255);
        }

        this.scheduleOnce(async () => {
            SVGraphics.eventTarget.on(SVGraphics.EventType.GRAPHICS_PARSED, this.onGraphicsParsed, this);
            SVGraphics.eventTarget.on(SVGraphics.EventType.INVALID_SVG_PLOT, this.onInvalidSvgPlot, this);
            
            try {
                let response = await fetch(this._svgPath);
                if (response.ok) {
                    const plot = await response.text();
                    ImageSwitcher.eventTarget.emit(ImageSwitcher.EventType.FETCH_IMAGE, plot);
                } else {
                    this._showError('HTTP Error: ' + response.status);
                }
            } catch (error) {
                this._showError(error.message);
            }
        });
    }

    onGraphicsParsed() {
        SVGraphics.eventTarget.off(SVGraphics.EventType.GRAPHICS_PARSED, this.onGraphicsParsed, this);
        SVGraphics.eventTarget.off(SVGraphics.EventType.INVALID_SVG_PLOT, this.onInvalidSvgPlot, this);
            
        if (this.loadingLabel) {
            this.loadingLabel.color = new Color(0, 0, 0, 0);
        }
        
        AnimationToggler.eventTarget.emit(AnimationToggler.EventType.ANIMATION_SWITCH_ON);
    }

    onInvalidSvgPlot() {
        SVGraphics.eventTarget.off(SVGraphics.EventType.GRAPHICS_PARSED, this.onGraphicsParsed, this);
        SVGraphics.eventTarget.off(SVGraphics.EventType.INVALID_SVG_PLOT, this.onInvalidSvgPlot, this);
    
        this._showError('SVG file is invalid.');
    }

    private _showError(errorText: string) {
        if (this.loadingLabel) {
            const lastLoadingText = this.loadingLabel.string;

            this.loadingLabel.string = `${errorText}\n\nLoading last image.\nPlease wait...`;

            this.scheduleOnce(() => {
                this.loadingLabel.color = new Color(0, 0, 0, 0);
                this.loadingLabel.string = lastLoadingText;

                ImageSwitcher.eventTarget.emit(ImageSwitcher.EventType.UPDATE_IMAGE);
            }, 1.5);
        }
    }
}


