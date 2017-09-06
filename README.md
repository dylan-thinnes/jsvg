# svgtojs
svgtojs is a tool that uses canvg and sinonjs to write out the necessary javascript commands to draw an svg with js on a canvas. By creating permanent files, this avoids any problems from canvg spec changes and allows you to avoid the prohibitive size of the library. In this fashion, svg files can be converted to permanent javascript files, which then can be run to produce the same image output.

## How It Works
Canvg (canvg/canvg) is a library that can take svg and draw it to a <canvas> using javascript. Sinonjs (sinonjs/sinon) is a test framework which can see what function calls are made to the <canvas> context object. By combining the two, svg2js can permanently record what function calls need to be made to draw an svg file to a canvas. It will take this record and turn it into valid javascript, thereby creating a permanent copy of the original svg as scalable javascript,

## When To Use
This utility turns svg images into javascript files that write to canvas. As such, it can essentially convert svg to bitmaps at varying resolutions and for not much size increase over svg and much less size than bitmap.
A few examples include:
- If you have an environment which requires bitmap / which cannot use svg images but you still want varying resolutions
- If you have an environment which requires bitmap / which cannot use svg images but you don't want to broadcast the much larger bitmap images
- You like canvg but want to be able to vary color palettes and styles without changing the underlying svg markup
- You are more comfortable manipulating javascript commands than svg markup

## How To Use
Unfortunately, until there is a global Canvas object in NodeJS, this utility cannot be readily made into a command line utility. However, a file upload/convert/download system that runs on the browser is in the works.  
In the meantime, you will need to use the UI to convert files individually by pasting in their svg code on the right, clicking 'Convert', and pasting out the JS code on the left into a file of your choosing.

## Size Considerations
The resulting javascript is often very easily made smaller. By trimming numbers with floating point errors and removing many redundant ctx.save and ctx.restore function calls yourself, the average scriptified svg should only be about 2 times larger than its minified original svg counterpart. After compression into tar.gz, almost all scriptified svgs are only about 1.5x the size of their counterparts.
