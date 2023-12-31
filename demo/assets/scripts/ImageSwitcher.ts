import { _decorator, Component, Node, EventTarget, TextAsset } from 'cc';
import { SVGraphics } from './SVGraphics';
const { ccclass, property } = _decorator;

const imageSwitcherEventTarget: EventTarget = new EventTarget();
enum ImageSwitcherEventType {
    SWITCH_IMAGE,
    FETCH_IMAGE,
    UPDATE_IMAGE
}

@ccclass('ImageSwitcher')
export class ImageSwitcher extends Component {
    public static eventTarget: EventTarget = imageSwitcherEventTarget;
    public static EventType: typeof ImageSwitcherEventType = ImageSwitcherEventType;

    @property({ type: SVGraphics, displayName: 'SVGraphics' })
    public SVGraphics: SVGraphics = null;
    @property({ type: [TextAsset]})
    public images: TextAsset[] = [];

    private _currentImageIndex: number = 0;

    start() {
        if (!this.SVGraphics || this.images.length === 0) {
            this.enabled = false;
            return;
        }

        imageSwitcherEventTarget.on(ImageSwitcherEventType.SWITCH_IMAGE, this.onSwitchImage, this);
        imageSwitcherEventTarget.on(ImageSwitcherEventType.FETCH_IMAGE, this.onFetchImage, this);
        imageSwitcherEventTarget.on(ImageSwitcherEventType.UPDATE_IMAGE, this.onUpdateImage, this);

        this._currentImageIndex = this.images.indexOf(this.SVGraphics.svgFile) | 0;
    }

    onSwitchImage() {
        this._currentImageIndex = (this._currentImageIndex + 1) % this.images.length;
        this.onUpdateImage();
    }

    onFetchImage(svgPlot: string) {
        this.SVGraphics.appearanceProgress = 0;
        this.SVGraphics.recompileGraphics(svgPlot);
    }

    onUpdateImage() {
        this.SVGraphics.appearanceProgress = 0;
        this.SVGraphics.svgFile = this.images[this._currentImageIndex];
    }
}


