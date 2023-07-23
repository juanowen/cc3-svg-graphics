import { _decorator, Component, Node } from 'cc';
import { AnimationToggler } from '../AnimationToggler';
import { ScreenButton } from './ScreenButton';
const { ccclass, property } = _decorator;

@ccclass('EraseButton')
export class EraseButton extends ScreenButton {
    onTouchStart() { 
        super.onTouchStart();

        AnimationToggler.eventTarget.emit(AnimationToggler.EventType.ANIMATION_SWITCH_OFF);
    }
}


