[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)
# Fractals.js
This is a canvas application that explores fractal patterns based off a specific rule. Its main focus is on branching Y based fractals on a grid, but it supports any combination of Y or T branching patterns. The concept is original, but since its inception has been explored, and there are similar resources for playing with these fractals.

## Getting Started

```
npm install
```
```
npm run serve
```

### Prerequisites

You will need a modern browser and npm in order to use this code.

### Query Paramters
Currently, the site is controled by a series of query strings. All query strings are optional. They try to fall back to sensible defaults.

`pattern`: Any string of `y` and/or `t`. Each layer will check the position of the string to see if the next points should branch in a y dirrection or a t direction. Loops. `default: 'yyyyyyyy'`

`cgs`: Stands for 'Color Group Size'. This is any number, and it dictates how many layers should be a certain color, before moving on to the next color. `default: pattern.length`

`layers`: A number which dictates how many layers should be generated. `default: cgs * numOfColors`

`lineLength`: The length of any line given in pixels. `default: (window.screen.height - 140) / (2 * layers)`

`lineWidth`: The width of any line given in pizels. Defaults to a golden rectangle with the lineLength `default: lineLength / 1.61803398875`

`animated`: `0`, `1`, or `2`. `0` will not load the page until the render is complete. `1` will show every layer as it is generated. `2` will show every point as it is generated. `default: 1`

`centerSize`: The number of layers long the first layer should be. This creates some space to work with, especially useful for most patterns with a `t` intersection. `default: 1`,

`dim`: The height/width of the canvas. If not specified, will try to fit to `layers` and `lineLength`.

`bw`: `0`, or `1`. If `1` then colors are ignored and the output is black and white. `default: 0`

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Relevant Links
[Terrific Toothpick Patterns](https://www.youtube.com/watch?v=_UtCli1SgjI&t=344s) - A Numberphile episode going into the fractal pattern at play.

[Toothpick Simulator](http://oeis.org/A139250/a139250.anim.html) - A similar site with more robust pattern manipulation

