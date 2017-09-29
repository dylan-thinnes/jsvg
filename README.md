# svgtojs
svgtojs is a tool that uses canvg and sinonjs to write out the necessary javascript commands to draw an svg with js on a canvas. By creating permanent files, this avoids any problems from canvg spec changes and allows you to avoid the prohibitive size of the library. In this fashion, svg files can be converted to permanent javascript files, which then can be run to produce the same image output.

## How to Use
Visit [Development Version](https://dylan-thinnes.github.io/svgtojs)  
Visit [Stable Version](https://svgtojs.github.io)  (Most people will want this)
*When experienced*, you *should* use the Batch Tool at the Stable Version, which produces Javascript files that define a global SVGTOJS file. In this global, there is an index for each converted svg file which stores a function (ctx, scalex, scaleY). Include the js file in your project, then call the functions corresponding to the svg files you want to output, passing in the context and (optionally) two numbers to scale the drawing.  
*If you are new to this*, you will likely find it easier and more instructive to use the Copy Paste Tool at the Stable Version to convert files individually by pasting in their svg markup on the left, clicking 'Convert', and pasting out the JS function on the right into a file of your choosing. Note that this function is not stored in an SVGTOJS global, unlike the Batch Tool.  
*To develop* we recommend you use the Development Version hosted in this repo.

## When To Use
This utility turns svg images into javascript files that write to canvas. As such, it can essentially convert svg to bitmaps at varying resolutions and for not much size increase over svg and much less size than bitmap.
A few examples include:
- If you have an environment which cannot use svg images but you still want varying resolutions.
- If you have an environment which requires bitmaps but you don't want to broadcast the much larger bitmap images.
- You like canvg but want to be able to vary color palettes and styles without changing the underlying svg markup.
- You are more comfortable manipulating javascript commands than svg markup.

## Size Considerations
The resulting javascript is often very easily made smaller.  
By trimming numbers with floating point errors and removing many redundant ctx.save and ctx.restore function calls yourself, the average scriptified svg should only be about 2 times larger than its minified original svg counterpart. After compression into tar.gz, almost all scriptified svgs are only about 1.5x the size of their counterparts.

## How It Works
Canvg (canvg/canvg) is a library that can take svg and draw it to a <canvas> using javascript. Sinonjs (sinonjs/sinon) is a test framework which can see what function calls are made to the <canvas> context object. By combining the two, svg2js can permanently record what function calls need to be made to draw an svg file to a canvas. It will take this record and turn it into valid javascript, thereby creating a permanent copy of the original svg as scalable javascript,

## Project Status
Conversion system is complete.
Batch Tool and Copy Paste Tool is complete.
Optimization of output for size is done, though improveable through minifiers and compression.  
A NodeJS utility is on the backburner.

