import { _decorator, Component, Node, Color, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ScreenButton')
export class ScreenButton extends Component {
    @property({ type: Node })
    public edgeRenderNode: Node = null;
    @property({ type: Node })
    public textNode: Node = null;

    public isPushed: boolean = false;

    private _sprite: Sprite = null;
    private _startColor: Color = null;

    start() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);

        this._sprite = this.getComponent(Sprite);
        if (this._sprite) {
            this._startColor = this._sprite.color.clone();
        }
    }

    toggleStatus() {
        if (this.edgeRenderNode) {
            this.edgeRenderNode.setPosition(0, this.isPushed ? 20 : -20);
        }
        if (this.textNode) {
            this.textNode.setPosition(0, this.isPushed ? -5 : 5);
        }
        if (this._sprite) {
            this._sprite.color = this.isPushed ? 
                new Color(this._startColor.r * 0.5, this._startColor.g * 0.5, this._startColor.b * 0.5) : 
                this._startColor;
        }
    }

    onTouchStart() { 
        this.isPushed = true;
        this.toggleStatus();
    }

    onTouchEnd() { 
        this.isPushed = false;
        this.toggleStatus();
    }
}


