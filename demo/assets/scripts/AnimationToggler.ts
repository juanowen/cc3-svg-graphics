import { _decorator, Component, Animation, EventTarget } from 'cc';
import { SVGraphics } from './SVGraphics';
const { ccclass, property } = _decorator;

const animationTogglerEventTarget: EventTarget = new EventTarget();
enum AnimationTogglerEventType {
    ANIMATION_SWITCH_ON,
    ANIMATION_SWITCH_OFF
}

@ccclass('AnimationToggler')
export class AnimationToggler extends Component {
    static eventTarget: EventTarget = animationTogglerEventTarget;
    static EventType: typeof AnimationTogglerEventType = AnimationTogglerEventType;

    private _animation: Animation = null;
    private _isInProgress: boolean = false;

    start() {
        this._animation = this.getComponent(Animation);

        animationTogglerEventTarget.on(
            AnimationTogglerEventType.ANIMATION_SWITCH_ON, 
            this.onAnimationSwitchOn, 
            this
        );
        animationTogglerEventTarget.on(
            AnimationTogglerEventType.ANIMATION_SWITCH_OFF, 
            this.onAnimationSwitchOff, 
            this
        );

        SVGraphics.eventTarget.on(SVGraphics.EventType.GRAPHICS_ERASED, this.resetProgressState, this);
        SVGraphics.eventTarget.on(SVGraphics.EventType.GRAPHICS_DRAWN, this.resetProgressState, this);
    }

    onAnimationSwitchOn() {
        if (this._isInProgress) return;

        if (this._animation && this._animation.clips.length > 0) {
            this._isInProgress = true;
            this._animation.play(this._animation.clips[0].name);
        }
    }

    onAnimationSwitchOff() {
        if (this._isInProgress) return;

        if (this._animation && this._animation.clips.length > 1) {
            this._isInProgress = true;
            this._animation.play(this._animation.clips[1].name);
        }
    }

    resetProgressState() {
        this._isInProgress = false;
    }
}


