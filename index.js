import materialColors from './node_modules/material-colors/dist/colors.es2015.js'
import './node_modules/file-saver/src/FileSaver.js'

const saveAs = window.saveAs

let filteredColors = Object.entries(materialColors).slice(0, 16).reverse()
filteredColors = [filteredColors[15], ...filteredColors.slice(0, 15)]

const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')

const Vue = window.Vue
const moment = window.moment

window.stopped = false

const urlParams = new URLSearchParams(window.location.search)
window.urlParams = urlParams
const layers = Number(urlParams.get('layers')) || 128
const lineLength = Number(urlParams.get('lineLength')) || (window.screen.height - 140) / (layers * 2)
const lineWidth = Number(urlParams.get('lineWidth')) || lineLength / 1.61803398875
const delay = Number(urlParams.get('delay')) || 1
const animated = Number(urlParams.get('animated')) || 1
const centerSize = Number(urlParams.get('center')) || 1
const pattern = urlParams.get('pattern') || 'yyyyyyyy'
const colorGroupSize = Number(urlParams.get('cgs')) || getDefaultColorGroupSize()
const dim = Number(urlParams.get('dim')) || (layers + (centerSize - 1) + colorGroupSize) * lineLength * 2
const bw = Number(urlParams.get('bw')) || 0

canvas.height = dim
canvas.width = dim

getColorForLayer(0)

window.labelsApp = new Vue({
  el: '#appLabels',
  data: {
    timeStartAll: new Date(),
    now: new Date(),
    timerStartLayer: new Date(),
    timesToDrawPoints: [],
    timesToDrawDiagonals: [],
    timesToDrawStraights: [],
    totalPoints: 0,
    currentLayer: 0,
    lastLayerDuration: 0
  },
  computed: {
    avgPointDraw () {
      if (this.timesToDrawPoints.length === 0) {
        return 0
      }
      if (this.timesToDrawPoints.length < 256) {
        return this.timesToDrawPoints.reduce((x, y) => x + y) / this.timesToDrawPoints.length
      }

      const last256 = this.timesToDrawPoints.slice(this.timesToDrawPoints.length - 256, this.timesToDrawPoints.length)
      return last256.reduce((x, y) => x + y) / last256.length
    },
    avgPointDrawDiagonals () {
      if (this.timesToDrawDiagonals.length === 0) {
        return 0
      }
      if (this.timesToDrawDiagonals.length < 256) {
        return this.timesToDrawDiagonals.reduce((x, y) => x + y) / this.timesToDrawDiagonals.length
      }

      const last256 = this.timesToDrawDiagonals.slice(this.timesToDrawDiagonals.length - 256, this.timesToDrawDiagonals.length)
      return last256.reduce((x, y) => x + y) / last256.length
    },
    avgPointDrawStraights () {
      if (this.timesToDrawStraights.length === 0) {
        return 0
      }
      if (this.timesToDrawStraights.length < 256) {
        return this.timesToDrawStraights.reduce((x, y) => x + y) / this.timesToDrawStraights.length
      }

      const last256 = this.timesToDrawStraights.slice(this.timesToDrawStraights.length - 256, this.timesToDrawStraights.length)
      return last256.reduce((x, y) => x + y) / last256.length
    },
    totalDuration () {
      return this.now - this.timeStartAll
    },
    layerDuration () {
      return this.now - this.timeStartLayer
    }
  },
  filters: {
    toRuntime (value) {
      const md = moment.duration(value)
      return `${md.hours().toString().padStart(2, '0')}:${md.minutes().toString().padStart(2, '0')}:${md.seconds().toString().padStart(2, '0')}:${md.milliseconds().toFixed(0).toString().padStart(3, '0')}`
      // return md.humanize()
    }
  },
  methods: {
    moveToCenter () {
      window.scrollTo(canvas.width / 2 + 16 - window.screen.width / 2, canvas.height / 2 + 16 - window.screen.height / 2)
    },
    download () {
      canvas.toBlob(blob => {
        const humanDuration = moment.duration(this.now - this.timeStartAll).humanize()
        saveAs(blob, `Fractal - ${this.currentLayer} Layers - ${canvas.width}x${canvas.height} - ${humanDuration}.png`)
      })
    },
    stop () {
      window.stopped = true
    }
  }
})

const directions = {
  north: 0,
  northeast: 1,
  east: 2,
  southeast: 3,
  south: 4,
  southwest: 5,
  west: 6,
  northwest: 7
}

const vectors = {
  0: [0, -1],
  1: [1, -1],
  2: [1, 0],
  3: [1, 1],
  4: [0, 1],
  5: [-1, 1],
  6: [-1, 0],
  7: [-1, -1]
}

ctx.beginPath()
ctx.rect(0, 0, canvas.clientWidth, canvas.height)
ctx.fillStyle = 'white'
ctx.fill()

const centerPoint = {
  x: canvas.width / 2,
  y: canvas.height / 2
}

let allPoints = [centerPoint]
let allChuncks = []
window.allChuncks = allChuncks
let diagonalChunks = []
window.diagonalChunks = diagonalChunks
let allDiagonalPoints = []
let alivePoints = []
let pointsToDrawTo = [{
  x: centerPoint.x,
  y: centerPoint.y - lineLength * centerSize,
  direction: directions.north,
  alive: true
},
{
  x: centerPoint.x + lineLength * centerSize,
  y: centerPoint.y,
  direction: directions.east,
  alive: true
},
{
  x: centerPoint.x,
  y: centerPoint.y + lineLength * centerSize,
  direction: directions.south,
  alive: true
},
{
  x: centerPoint.x - lineLength * centerSize,
  y: centerPoint.y,
  direction: directions.west,
  alive: true
}
]

for (let point of pointsToDrawTo) {
  ctx.strokeStyle = getColorForLayer(0)
  ctx.beginPath()
  ctx.lineWidth = lineWidth
  ctx.moveTo(centerPoint.x, centerPoint.y)
  ctx.lineTo(point.x, point.y)
  ctx.stroke()
  if (!allPoints.find(ap => ap === point)) {
    alivePoints.push(point)
  }
  allPoints.push(point)
}

pointsToDrawTo = []

const startDrawLoop = async (layers) => {
  for (let i = 1; i < layers; i++) {
    if (window.stopped) {
      break
    }
    window.labelsApp.timeStartLayer = new Date()
    window.labelsApp.currentLayer = i + 1
    const branchStyle = getBranchStyle(i)
    ctx.strokeStyle = getColorForLayer(i)
    let alivePointsForLayer = allPoints.filter(p => p.alive)
    for (let point of alivePointsForLayer) {
      const startTime = new Date()
      let pointsToDrawTo = []
      let directionsToDraw = getDirectionsToDraw(point, branchStyle)

      for (let direction of directionsToDraw) {
        if (detectDiagonalCollision(point, direction)) {
          pointsToDrawTo.push({
            x: point.x + vectors[direction][0] * lineLength / 2,
            y: point.y + vectors[direction][1] * lineLength / 2,
            direction: direction,
            alive: false
          })
        } else {
          pointsToDrawTo.push({
            x: point.x + vectors[direction][0] * lineLength,
            y: point.y + vectors[direction][1] * lineLength,
            direction: direction,
            alive: true
          })
        }
      }

      for (let pointToDrawTo of pointsToDrawTo) {
        checkForCollisions(pointToDrawTo)

        ctx.beginPath()
        ctx.lineWidth = lineWidth
        ctx.moveTo(point.x, point.y)
        ctx.lineTo(pointToDrawTo.x, pointToDrawTo.y)

        ctx.stroke()

        allPoints.push(pointToDrawTo)

        const chunkColumn = getPointColumn(pointToDrawTo)
        const chunkRow = getPointRow(pointToDrawTo)
        initalizeAllChunk(chunkColumn, chunkRow)
        allChuncks[chunkColumn][chunkRow].push(pointToDrawTo)

        if (pointToDrawTo.direction % 2 === 1) {
          allDiagonalPoints.push(pointToDrawTo)
          initalizeDiagonalChunck(chunkColumn, chunkRow)
          diagonalChunks[chunkColumn][chunkRow].push(pointToDrawTo)
        }
        window.labelsApp.totalPoints = allPoints.length
        if (animated === 2) {
          await sleep(delay)
        }
      }
      point.alive = false
      const endTime = new Date()
      window.labelsApp.now = endTime
      window.labelsApp.timesToDrawPoints.push(endTime - startTime)
      if (point.direction % 2 === 0) {
        window.labelsApp.timesToDrawDiagonals.push(endTime - startTime)
      } else {
        window.labelsApp.timesToDrawStraights.push(endTime - startTime)
      }
    }
    window.labelsApp.lastLayerDuration = window.labelsApp.layerDuration
    if (animated === 1) {
      await sleep(delay)
    }
  }
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function detectDiagonalCollision (point, directionToDraw) {
  if (directionToDraw % 2 === 0) {
    return false
  }

  // let pointDirectionToCheck1 = [(directionToDraw + 1) % 8, (directionToDraw - 2) % 8]
  // let pointDirectionToCheck2 = [(directionToDraw - 1) % 8, (directionToDraw + 2) % 8]
  let pointDirectionToCheck1 = [(directionToDraw + 1) % 8, (directionToDraw + 2) % 8]
  let pointDirectionToCheck2 = [(directionToDraw - 1 + 8) % 8, (directionToDraw - 2 + 8) % 8]

  const diagonalChunkColumn = getPointColumn(point)
  const diagonalChunkRow = getPointRow(point)
  let pointsToCheck = []

  for (let i = diagonalChunkColumn - 1; i <= diagonalChunkColumn + 1; i++) {
    for (let j = diagonalChunkRow - 1; j <= diagonalChunkRow + 1; j++) {
      initalizeDiagonalChunck(i, j)
      pointsToCheck = pointsToCheck.concat(diagonalChunks[i][j])
    }
  }

  let potentialCollision = pointsToCheck.find(p => (p.x === point.x + vectors[pointDirectionToCheck1[0]][0] * lineLength &&
      p.y === point.y + vectors[pointDirectionToCheck1[0]][1] * lineLength &&
      p.direction === pointDirectionToCheck1[1]) ||
    (p.x === point.x + vectors[pointDirectionToCheck2[0]][0] * lineLength &&
      p.y === point.y + vectors[pointDirectionToCheck2[0]][1] * lineLength &&
      p.direction === pointDirectionToCheck2[1]))

  if (potentialCollision) {
    return true
  }

  return false
}

startDrawLoop(layers)

function getColorForLayer (layerIndex) {
  if (bw) {
    return '#000000'
  }
  if (layerIndex > 0 && pattern[0].toUpperCase() === 'T') {
    layerIndex--
  }
  const localIndex = (layerIndex) % (colorGroupSize * filteredColors.length)
  let colorIndex = Math.floor(localIndex / colorGroupSize)
  return filteredColors[colorIndex][1][500]
}

function initalizeDiagonalChunck (column, row) {
  if (diagonalChunks[column] == null) {
    diagonalChunks[column] = []
  }
  if (diagonalChunks[column][row] == null) {
    diagonalChunks[column][row] = []
  }
}

function initalizeAllChunk (column, row) {
  if (allChuncks[column] == null) {
    allChuncks[column] = []
  }
  if (allChuncks[column][row] == null) {
    allChuncks[column][row] = []
  }
}

function checkForCollisions (point) {
  const col = getPointColumn(point)
  const row = getPointRow(point)
  let pointsToCheck = []

  for (let i = col - 1; i <= col + 1; i++) {
    for (let j = row - 1; j <= row + 1; j++) {
      if (i < 0 || j < 0) {
        continue
      }
      initalizeAllChunk(i, j)
      pointsToCheck = pointsToCheck.concat(allChuncks[i][j])
    }
  }

  for (let p of pointsToCheck.filter(p => p.x === point.x && p.y === point.y)) {
    if (p.alive) {
      p.alive = false
    }
    point.alive = false
  }
}

function getPointColumn (point) {
  return Math.floor(point.x / (8 * lineLength)) + (Math.ceil(canvas.width / (8 * lineLength)) * 3)
}

function getPointRow (point) {
  return Math.floor(point.y / (8 * lineLength)) + (Math.ceil(canvas.height / (8 * lineLength)) * 3)
}

function getDirectionsToDraw (point, branchStyle) {
  const directionsToDraw = []
  branchStyle.toUpperCase()
  switch (branchStyle.toUpperCase()) {
    case 'Y':
    default:
      switch (point.direction) {
        case directions.north:
          directionsToDraw.push(directions.northwest)
          directionsToDraw.push(directions.northeast)
          break
        case directions.northeast:
          directionsToDraw.push(directions.north)
          directionsToDraw.push(directions.east)
          break
        case directions.east:
          directionsToDraw.push(directions.northeast)
          directionsToDraw.push(directions.southeast)
          break
        case directions.southeast:
          directionsToDraw.push(directions.east)
          directionsToDraw.push(directions.south)
          break
        case directions.south:
          directionsToDraw.push(directions.southeast)
          directionsToDraw.push(directions.southwest)
          break
        case directions.southwest:
          directionsToDraw.push(directions.south)
          directionsToDraw.push(directions.west)
          break
        case directions.west:
          directionsToDraw.push(directions.southwest)
          directionsToDraw.push(directions.northwest)
          break
        case directions.northwest:
          directionsToDraw.push(directions.west)
          directionsToDraw.push(directions.north)
          break
      }
      break
    case 'T':
      switch (point.direction) {
        case directions.north:
          directionsToDraw.push(directions.west)
          directionsToDraw.push(directions.east)
          break
        case directions.northeast:
          directionsToDraw.push(directions.northwest)
          directionsToDraw.push(directions.southeast)
          break
        case directions.east:
          directionsToDraw.push(directions.north)
          directionsToDraw.push(directions.south)
          break
        case directions.southeast:
          directionsToDraw.push(directions.northeast)
          directionsToDraw.push(directions.southwest)
          break
        case directions.south:
          directionsToDraw.push(directions.east)
          directionsToDraw.push(directions.west)
          break
        case directions.southwest:
          directionsToDraw.push(directions.southeast)
          directionsToDraw.push(directions.northwest)
          break
        case directions.west:
          directionsToDraw.push(directions.south)
          directionsToDraw.push(directions.north)
          break
        case directions.northwest:
          directionsToDraw.push(directions.southwest)
          directionsToDraw.push(directions.northeast)
          break
      }
      break
  }
  return directionsToDraw
}

function getBranchStyle (layerNumber) {
  // if (pattern[0].toUpperCase === 'T') {
  //   layerNumber++
  // }
  return pattern[(layerNumber) % pattern.length]
}

function getDefaultColorGroupSize () {
  const numOfT = (pattern.toUpperCase().match(/T/g) || []).length
  const numOfY = (pattern.toUpperCase().match(/Y/g) || []).length

  return (numOfT + numOfY) * (numOfY % 2 + 1)
}
