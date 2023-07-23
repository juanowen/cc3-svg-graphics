import { _decorator, Component, Node, Label, Animation, Color } from 'cc';
import { AnimationToggler } from '../AnimationToggler';
import { ImageSwitcher } from '../ImageSwitcher';
import { SVGraphics } from '../SVGraphics';
import { ScreenButton } from './ScreenButton';
const { ccclass, property } = _decorator;

@ccclass('SwitchButton')
export class SwitchButton extends ScreenButton {
    @property({ type: Label })
    public loadingLabel: Label = null;

    onTouchStart() { 
        super.onTouchStart();

        AnimationToggler.eventTarget.emit(AnimationToggler.EventType.ANIMATION_SWITCH_OFF);
        SVGraphics.eventTarget.on(SVGraphics.EventType.GRAPHICS_ERASED, this.onGraphicsErased, this);
    }

    onGraphicsErased() {
        SVGraphics.eventTarget.off(SVGraphics.EventType.GRAPHICS_ERASED, this.onGraphicsErased, this);

        if (this.loadingLabel) {
            this.loadingLabel.color = new Color(0, 0, 0, 255);
        }

        this.scheduleOnce(() => {
            SVGraphics.eventTarget.on(SVGraphics.EventType.GRAPHICS_PARSED, this.onGraphicsParsed, this);
            ImageSwitcher.eventTarget.emit(ImageSwitcher.EventType.SWITCH_IMAGE);
        });
    }

    onGraphicsParsed() {
        SVGraphics.eventTarget.off(SVGraphics.EventType.GRAPHICS_PARSED, this.onGraphicsParsed, this);

        if (this.loadingLabel) {
            this.loadingLabel.color = new Color(0, 0, 0, 0);
        }
        
        AnimationToggler.eventTarget.emit(AnimationToggler.EventType.ANIMATION_SWITCH_ON);
    }
}


