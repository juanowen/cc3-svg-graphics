# cc3-svg-graphics
CocosCreator 3.X module that allows you to create graphic element from svg file.

To achieve this, simply add an "SVGraphics" component to the node and fill "Svg file" property with asset contains your SVG code. This component accepts a TextAsset as input file, so you need to change the SVG file extension to 'TXT' before adding the file to the project.
 
Please note that this component can only render graphics with a solid fill and solid stroke without errors. Gradient backgrounds and dashed lines are not supported.

Also be aware that Cocos Creator does not implement *fill-rule#evenodd* svg property, so make sure all path elements of your svg file can be drawn with a single non-intersecting line. You can see the incorrect rendering behavior associated with this feature on the letter B in the NBC logo (click the "Switch SVG" button in the demo project to see this image).

You can see [DEMO here](https://juanowen.github.io/cc3-svg-graphics/index.html)

The functionality of switching images in this demo project is implemented only as an example. Avoid parsing SVG files in the final build. 
Note that SVG image parsing happens synchronously, which stops all processes on the current page. Ideally SVG files should be parsed in the editor window. In the build, it should only be drawn.

In this demo project, the following svg files found in the public domain were used:
- [Yacht on water 3D](https://freesvg.org/yacht-on-water-3d)
- [Low poly ship](https://freesvg.org/sail-ship-silhouette-low-poly)
- [NBC_logo](https://upload.wikimedia.org/wikipedia/commons/3/3f/NBC_logo.svg)
- [Brewing](https://www.reshot.com/free-svg-icons/item/brewing-9P4RTAUBX3/)
- [Github](https://www.reshot.com/free-svg-icons/item/github-NY46M9DGFU/)

Also in "PathParser" component was used code from [jkroso/parse-svg-path](https://github.com/jkroso/parse-svg-path) repo.
