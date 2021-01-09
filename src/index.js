import { Unistroke, DollarRecognizer } from './dollarOne';
import * as gesture from './dollarOne/gestures';

const DO = new DollarRecognizer();
const emptyFunc = () => { };
const svgPathId = 'elemefe_still_hiring_you_can_send_email_to_(yong.xiang@ele.me)';
class Canvas {
    constructor(options = {}) {
        this.options = Object.assign({
            el: document.body,
            onSwipe: emptyFunc,
            onGesture: emptyFunc,
            gestures: gesture,
            enablePath: true,
            lineColor: '#666',
            lineWidth: 4,
            timeDelay: 600,
            triggerMouseKey: 'right',
            activeColor: 'rgba(0, 0, 0, .05)',
            eventType: 'mouse',
            position: 'absolute',
            zIndex: 999999999,
        }, options);
        this.enable = true;
        this.path = null;
        this.startPos = null;
        this.endPos = null;
        this.direction = null;
        this.directionList = [];
        this.points = [];
        this.isMovable = false;
        // 是否有移动过，用于决定是否阻止 contextmenu
        this.hasMove = false;
        // 按下的 event
        this.downEvent = null;
        this.Unistrokes = [];

        this.path = document.getElementById(svgPathId);

        this._initUnistrokes(options.gestures || gesture);

        this._mouseDelayTimer = null;

        this._moveStart = this._moveStart.bind(this);
        this._move = this._move.bind(this);
        this._moveEnd = this._moveEnd.bind(this);
        this._contextmenu = this._contextmenu.bind(this);

        this.pointerStart = 'mousedown';
        this.pointerMove = 'mousemove';
        this.pointerUp = 'mouseup';
        this.pointerLeave = 'mouseleave';
        if (this.options.eventType === 'touch') {
            this.pointerStart = 'touchstart';
            this.pointerMove = 'touchmove';
            this.pointerUp = 'touchend';
            this.pointerLeave = 'touchcancel';
        }
        this.options.el.addEventListener(this.pointerStart, this._moveStart);
        this.options.el.addEventListener(this.pointerMove, this._move);
        this.options.el.addEventListener(this.pointerUp, this._moveEnd);
        this.options.el.addEventListener(this.pointerLeave, this._moveEnd);
        this.options.el.addEventListener('contextmenu', this._contextmenu);
    }

    _addPath(startPoint) {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.path.id = svgPathId;
        // 背景颜色
        let bg = this.options.activeColor ? `background: ${this.options.activeColor}` : '';
        this.svg.setAttribute('style', `position: ${this.options.position}; top: 0; left: 0; ${bg}; z-index: ${this.options.zIndex}`);
        this.svg.setAttribute('width', `${this.options.el.offsetWidth}`);
        this.svg.setAttribute('height', `${this.options.el.offsetHeight}`);
        this.svg.setAttribute('fill', 'none');

        this.points = [];
        // this.startPos = startPoint;
        this.path.setAttribute('stroke', this.options.lineColor);
        this.path.setAttribute('stroke-width', this.options.lineWidth);
        this.path.setAttribute('d', `M ${startPoint.x} ${startPoint.y}`);

        this.svg.appendChild(this.path);
        this.options.el.appendChild(this.svg);
    }

    _initUnistrokes(gestures) {
        if (Array.isArray(gestures)) {
            gestures.forEach((ges) => this.addGesture(ges));
        } else {
            const keys = Object.keys(gestures);
            keys.forEach((key) => this.addGesture(gestures[key]));
        }
    }

    _calcOffsetFromRoot(ele) {
        let topFromRoot = 0;
        let leftFromRoot = 0;
        let parent = ele.offsetParent;
        const IS_IE8 = navigator.userAgent.indexOf("MSIE 8") !== -1;
        leftFromRoot += ele.offsetLeft;
        topFromRoot += ele.offsetTop;
        while (parent) {
            leftFromRoot += parent.offsetLeft;
            topFromRoot += parent.offsetTop;
            if (!IS_IE8) {
                leftFromRoot += parent.clientLeft;
                topFromRoot += parent.clientTop;
            }
            parent = parent.offsetParent;
        }
        return {
            top: topFromRoot,
            left: leftFromRoot
        };
    }

    _handleMouseStart() {
        const offset = this._calcOffsetFromRoot(this.options.el);
        return {
            x: event.pageX - offset.left,
            y: event.pageY - offset.top,
        };
    }

    _handleTouchStart() {
        const offset = this._calcOffsetFromRoot(this.options.el);
        return {
            x: event.touches[0].pageX - offset.left,
            y: event.touches[0].pageY - offset.top,
        };
    }

    _moveStart(e) {
        if (!this.enable) return;
        this.hasMove = false;
        this.downEvent = e;

        let startPoint;
        if (this.options.eventType === 'touch') {
            startPoint = this._handleTouchStart();
        } else {
            if (this.options.triggerMouseKey === 'left') {
                if (event.button !== 0) return;
            } else {
                if (event.button !== 2) return;
            }
            startPoint = this._handleMouseStart();
        }

        this._mouseDelayTimer = setTimeout(() => {
            console.log(`_mouseDelayTimer`);
            if (this.options.enablePath) {
                this._addPath(startPoint);
            }

            this.isMovable = true;
        }, this.options.timeDelay);
    }

    _move(e) {
        // 如果按下，且横纵坐标都移动 > 2 才算移动了
        if (this.downEvent) {
            this.hasMove = Math.abs(e.x - this.downEvent.x) > 2 && Math.abs(e.y - this.downEvent.y) > 2;
        }
        // 坐标变化了，才算移动了，chrome 有点击右键，却触发 move 的 bug
        if (!this.hasMove) {
            return;
        }
        if (!this.isMovable) {
            clearTimeout(this._mouseDelayTimer);
            return;
        }

        e.preventDefault();
        this._progressSwipe(event);
    }

    _moveEnd() {
        if (!this.isMovable) {
            clearTimeout(this._mouseDelayTimer);
            return;
        }

        if (this.directionList.length > 0) {
            this.options.onSwipe(this.directionList);
        }
        if (this.points.length > 10) {
            const res = DO.recognize(this.points, this.Unistrokes, true);
            this.options.onGesture(res, this.points);
        }

        if (this.options.enablePath) {
            this.options.el.removeChild(this.svg);
        }
        this.isMovable = false;
        this.endPos = null;
        this.directionList = [];
        this.points = [];
    }

    _contextmenu(e) {
        // 如果启用 && 不是左键 && 已经移动=》禁用默认上下文
        if (this.enable && this.options.triggerMouseKey !== 'left' && this.hasMove) {
            e.preventDefault();
        }
    }

    _progressSwipe(e) {
        const pageX = this.options.eventType === 'touch' ? e.changedTouches[0].pageX : e.pageX;
        const pageY = this.options.eventType === 'touch' ? e.changedTouches[0].pageY : e.pageY;
        const offset = this._calcOffsetFromRoot(this.options.el);
        if (!this.endPos) {
            this.endPos = {
                x: pageX - offset.left,
                y: pageY - offset.top,
            };
            return;
        }

        const x = pageX - offset.left;
        const y = pageY - offset.top;
        const dx = Math.abs(x - this.endPos.x);
        const dy = Math.abs(y - this.endPos.y);

        if (dx > 5 || dy > 5) {
            this.points.push({ x, y });
            // draw the point
            if (this.options.enablePath) {
                const d = this.path.getAttribute('d');
                this.path.setAttribute('d', `${d} L ${x} ${y}`);
            }

            if (dx > 20 || dy > 20) {
                let direction;
                if (dx > dy) {
                    direction = x < this.endPos.x ? 'L' : 'R';
                }
                else {
                    direction = y < this.endPos.y ? 'U' : 'D';
                }
                const lastDirection = this.directionList.length <= 0 ? '' : this.directionList[this.directionList.length - 1];
                if (direction !== lastDirection) {
                    this.directionList.push(direction);
                }

                this.endPos = { x, y };
            }
        }
    }

    addGesture(ges = {}) {
        const { name, points } = ges;
        const safeName = name.trim();
        const msgMap = {
            'EMPTY_NAME': 'Invalid Gesture Name. `addGesture` failed.',
            'EMPTY_POINT': 'Invalid Points. `addGesture` failed.'
        };

        if (!safeName) {
            console.warn(msgMap['EMPTY_NAME']);
            return false;
        }

        if (!points || !Array.isArray(points) || !points.length) {
            console.warn(msgMap['EMPTY_POINT']);
            return false;
        }

        const unistroke = new Unistroke(name, points);
        this.Unistrokes.push(unistroke);
    }

    setEnable(b = true) {
        this.enable = b;
    }

    destroy() {
        this.options.el.removeEventListener(this.pointerStart, this._moveStart);
        this.options.el.removeEventListener(this.pointerMove, this._move);
        this.options.el.removeEventListener(this.pointerUp, this._moveEnd);
        this.options.el.removeEventListener(this.pointerLeave, this._moveEnd);
        this.options.el.removeEventListener('contextmenu', this._contextmenu);
    }

    refresh(options = {}) {
        this.options = Object.assign(this.options, options)
    }

}

const smartGesture = function (options) { return new Canvas(options) };

// module.exports = smartGesture;
export default smartGesture
