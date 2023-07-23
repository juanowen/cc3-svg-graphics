import { Vec2 } from 'cc';

class PathCommand {
    public command: string;             // command letter
    public commandType: string;         // command letter in lower case
    public isRelative: boolean;
    public args: number[];              // path args
    public glob: number[];              // path args in global space

    private _relativeMap: any = {
        'm': ['x', 'y'],
        'l': ['x', 'y'],
        'h': ['x'],
        'v': ['y'],
        'c': ['x', 'y', 'x', 'y', 'x', 'y'],
        's': ['x', 'y', 'x', 'y'],
        'a': [null, null, null, null, null, 'x', 'y'],
        'q': ['x', 'y', 'x', 'y'],
        't': ['x', 'y'],
    };
    private _lastPointMap: any = {
        'm': [0, 1],
        'l': [0, 1],
        'h': [0, null],
        'v': [null, 0],
        'c': [4, 5],
        's': [2, 3],
        'a': [5, 6],
        'q': [2, 3],
        't': [0, 1],
    };

    constructor(command: string, args: number[], lastPoint: Vec2, pathStartPoint: Vec2) {
        this.command = command;
        this.commandType = command.toLowerCase();
        this.isRelative = (command === this.commandType);
        this.args = args;
        this.glob = [];

        this.fillAbsoluteArgs(lastPoint, pathStartPoint);

        if (this.commandType === 'm') {
            pathStartPoint.x = this.glob[0];
            pathStartPoint.y = this.glob[1];
        } 
    }

    fillAbsoluteArgs(lastPoint: Vec2, pathStartPoint: Vec2) {
        if (this.isRelative) {
            const map: string[] = this._relativeMap[this.command];
            map && map.forEach((axis: string, i: number) =>{
                if (axis) {
                    this.glob[i] = lastPoint[axis] + this.args[i];
                }
            });
        } else {
            this.glob = [...this.args];
        }

        if (this.commandType === 'z') {
            lastPoint.x = pathStartPoint.x;
            lastPoint.y = pathStartPoint.y;
        } else {
            const map = this._lastPointMap[this.commandType];
            map && map.forEach((index: number, i: number) =>{
                if (index !== null) {
                    lastPoint[['x', 'y'][i]] = this.glob[index];
                }
            });
        }
    }

    getDefaultForm() {
        return `${this.command}${this.args.join(' ')} `;
    }

    getGlobalForm() {
        return `${this.command.toUpperCase()}${this.glob.join(' ')} `;
    }
}

export class PathParser {
    private static _argLength: any = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0};
    private static _segmentReg: RegExp = /([astvzqmhlc])([^astvzqmhlc]*)/ig;
    private static _numberReg: RegExp = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig;

    public static splitPaths(path: string): SVGPathElement[] {
        const paths: SVGPathElement[] = [];
        const commands: PathCommand[] = this.parse(path);

        let d = null;
        commands.forEach((command: PathCommand) => {
            if (command.commandType === 'm') {
                if (d !== null) {
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    path.setAttribute('d', d);
                    paths.push(path);
                    d = null;
                }
            }

            if (d === null) {
                d = command.getGlobalForm();
            } else {
                d += command.getDefaultForm();
            }
        });

        if (d !== null) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute('d', d);
            paths.push(path);
        }

        return paths;
    }

    public static parse(path: string): PathCommand[] {
        const result: PathCommand[] = [];

        const lastPoint: Vec2 = new Vec2(0, 0);
        const startPoint: Vec2 = new Vec2(0, 0);

        const replacer = (input: string, command: string, args: string) => {
            let commandType = command.toLowerCase();
            const numValues = this._parseValues(args);

            // overloaded moveTo
            if (commandType === 'm' && numValues.length > 2) {
                result.push(new PathCommand(command, numValues.splice(0, 2), lastPoint, startPoint));

                commandType = 'l';
                command = command === 'm' ? 'l' : 'L';
            }

            while (true) {
                if (numValues.length === this._argLength[commandType]) {
                    result.push(new PathCommand(command, numValues, lastPoint, startPoint));
                    break;
                }

                if (args.length < this._argLength[commandType]) {
                    throw new Error('malformed path data');
                }
                
                result.push(new PathCommand(command, numValues.splice(0, this._argLength[commandType]), lastPoint, startPoint));
            }
        };

        path.replace(this._segmentReg, replacer.bind(this));
        return result;
    }

    private static _parseValues(args: string): number[] {
        const numbers = args.match(this._numberReg);
        return numbers ? numbers.map(Number) : [];
    }
}


