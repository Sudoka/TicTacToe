var TicTacToe = {
  SelectionState: {
    none: 0,
    hovering: 1,
    selecting: 2
  },
  CellState: {
    empty: 0,
    cross: 'X',
    nought: 'O'
  },
  GameState: {
    finished: 0,
    waiting: 1,
    playing: 2
  }
};

TicTacToe.Game = function tic_tac_toe(play_id, game_id, waiting_id) {

  // let's make sure that the new operator is always used
  if ( !(this instanceof tic_tac_toe) ) {
    return new TicTacToe.Game(play_id, game_id, waiting_id);
  }

  this.ai = new TicTacToe_AI(this);
  this.board = this.createEmptyGrid();
  this.play_el = document.getElementById(play_id);
  this.waiting_el = document.getElementById(waiting_id);
  this.waiting_el.style.visibility = "hidden";
  this.game_id = game_id;
  this.hover_color = "#3394de";
  this.mouse_state = TicTacToe.SelectionState.none;
  this.game_state = TicTacToe.GameState.playing;
  this.hover_grid_pos = null;
  this.draw_queued = false;
  this.letter_radius = 30;
  this.padding = 8;
};

TicTacToe.Game.prototype = {

  start: function()
  {
    this.createStage();
    this.fitToSize();
    this.attachEvents();
    this.queueDraw();
  },

  createStage: function()
  {
    var config, rect, layer;

    config = {
      container: this.game_id
    };

    this.stage = new Kinetic.Stage(config);

    rect = new Kinetic.Rect({
      x: 0,
      y: 0,
      width: this.stage.getWidth(),
      height: this.stage.getHeight()
    });

    layer = new Kinetic.Layer();
    layer.add(rect);

    this.gridLayer = new Kinetic.Layer();
    this.stage.add(this.gridLayer);
    this.selectionLayer = new Kinetic.Layer();
    this.stage.add(this.selectionLayer);
    this.drawingLayer = new Kinetic.Layer();
    this.stage.add(this.drawingLayer);
    this.stage.add(layer);
  },

  createGridLayer: function ()
  {
    var config, y_offset, grid;

    grid = this.board.grid;

    config = {
      fontSize: 25,
      fontFamily: 'Calibri',
      fill: '#555',
      align: 'center',
      width: this.letter_radius * 2
    };

    y_offset = .7;

    for ( var r = 0; r < this.board.gridSize.rows; r++ )
    {
      for( var c = 0; c < this.board.gridSize.cols; c++ )
      {
        var coord, letter, rect;

        coord = this.gridPosToCanvasCoord({r: r, c: c});

        letter = new Kinetic.Text(config);
        letter.setText(grid[c][r] != TicTacToe.CellState.empty ? grid[c][r] : ' ');
        letter.setPosition(coord.x, coord.y + config.fontSize * y_offset );
        letter.setOffset(this.letter_radius, this.letter_radius);

        rect = new Kinetic.Rect({
          stroke: '#888',
          strokeWidth: 1,
          width: letter.getWidth(),
          height: letter.getWidth()
        });

        rect.setPosition(coord.x, coord.y );
        rect.setOffset(this.letter_radius, this.letter_radius);

        this.gridLayer.add(rect);
        this.gridLayer.add(letter);
      }
    }
    this.gridLayer.setWidth(this.letter_radius * 2 * this.board.gridSize.rows);
  },

  createEmptyGrid: function()
  {
    return {
      grid: [
        [TicTacToe.CellState.empty,TicTacToe.CellState.empty,TicTacToe.CellState.empty],
        [TicTacToe.CellState.empty,TicTacToe.CellState.empty,TicTacToe.CellState.empty],
        [TicTacToe.CellState.empty,TicTacToe.CellState.empty,TicTacToe.CellState.empty]
      ],
      gridSize: {
        rows: 3,
        cols: 3
      }
    }
  },

  attachEvents: function()
  {
    var stage = this.stage;
    stage.on("mouseover", $.proxy(this.onMouseOver, this));
    stage.on("mouseout", $.proxy(this.onMouseOut, this));
    stage.on("mousedown touchstart", $.proxy(this.onMouseDown, this));

    var el = this.play_el, that = this;
    el.addEventListener("click", function() {
      that.resetGame();
    })
  },

  canvasCoordToGridPos: function(coord)
  {
    var grid_pos = {
      c: Math.floor( (coord.x - this.padding) / (this.letter_radius * 2) ),
      r: Math.floor( (coord.y - this.padding) / (this.letter_radius * 2) )
    };

    if ( grid_pos.r < 0 ||
      grid_pos.c < 0 ||
      grid_pos.r >= this.board.gridSize.rows ||
      grid_pos.c >= this.board.gridSize.cols ) {
      return null;
    }

    return grid_pos;
  },

  gridPosToCanvasCoord: function(pos)
  {
    return {
      x: this.padding + (pos.c +.5) * this.letter_radius * 2,
      y: this.padding + (pos.r +.5) * this.letter_radius * 2
    };
  },

  isHovering: function()
  {
    return this.mouse_state == TicTacToe.SelectionState.hovering;
  },

  isCellOpen: function()
  {
    return !this.hover_grid_pos
        || !this.board.grid[this.hover_grid_pos.c][this.hover_grid_pos.r]
  },

  onMouseOver: function()
  {
    if (this.mouse_state == TicTacToe.SelectionState.none &&
      this.game_state == TicTacToe.GameState.playing) {
      this.mouse_state = TicTacToe.SelectionState.hovering;
      this.hover_grid_pos = this.canvasCoordToGridPos(this.stage.getMousePosition());
      this.queueDraw();
    }
  },

  onMouseOut: function()
  {
    if (this.mouse_state == TicTacToe.SelectionState.hovering) {
      this.mouse_state = TicTacToe.SelectionState.none;
      this.hover_grid_pos = null;
      this.queueDraw();
    }
  },

  onMouseDown: function()
  {
    if (this.game_state == TicTacToe.GameState.playing) {

      var grid_pos = this.canvasCoordToGridPos(this.stage.getMousePosition());

      if (!grid_pos) {
        return;
      }

      if (this.board.grid[grid_pos.c][grid_pos.r]) {
        return;
      }

      this.waiting_el.style.visibility = "visible";
      this.game_state = TicTacToe.GameState.waiting;

      this.play_el.disabled = true;
      this.board.grid[grid_pos.c][grid_pos.r] = TicTacToe.CellState.cross;

      this.queueDraw();

      // the computer responds too quickly. Let's make the computer seem more
      // realistic by giving it a reaction time similar to what a human might expect.
      var reaction_time = 200, that = this;
      setTimeout(function() {
        that.ai.getNextGameState(that.board);
        that.queueDraw();
      }, reaction_time);
    }
  },

  fitToSize: function()
  {
    var width = this.board.gridSize.cols * this.letter_radius * 2 + this.padding * 2;
    var height = this.board.gridSize.rows * this.letter_radius * 2 + this.padding * 2;

    this.stage.setSize(width, height);
  },

  queueDraw: function()
  {
    if (!this.draw_queued) {
      this.draw_queued = true;
      requestAnimFrame($.proxy(this.onDraw, this));
    }
  },

  onDraw: function()
  {
    this.selectionLayer.removeChildren();
    this.gridLayer.removeChildren();

    this.drawGrid();

    if (this.isCellOpen()) {
      this.drawHover();
    }

    this.stage.draw();

    this.draw_queued = false;
  },

  drawHover: function()
  {
    var coord, highlight;
    if (this.isHovering() && this.hover_grid_pos) {
      coord = this.gridPosToCanvasCoord(this.hover_grid_pos);
      highlight = this.getHighlight(coord);
      this.selectionLayer.add(highlight);
    }
  },

  drawWinningLine: function(start, end)
  {
    var line = new Kinetic.Line({
      points: [start, end],
      stroke: 'red',
      strokeWidth: 5,
      lineCap: 'round',
      lineJoin: 'round'
    });

    this.drawingLayer.add(line);
  },

  drawCatsGame: function()
  {
    config = {
      fontSize: 100,
      fontFamily: 'Calibri',
      fill: 'red',
      align: 'center',
      width: this.letter_radius * 2
    };

    var coord, letter;

    coord = this.gridPosToCanvasCoord({r: 1, c: 1});

    letter = new Kinetic.Text(config);
    letter.setText('C');
    letter.setPosition(coord.x, coord.y + config.fontSize * -0.22 );
    letter.setOffset(this.letter_radius, this.letter_radius);

    this.drawingLayer.add(letter);
  },

  cpuMove: function(move)
  {
    if (!move) {
      return;
    }

    if (move.c < 0 || move.c > 2
      || move.r < 0 || move.r > 2) {
      return;
    }

    this.board.grid[move.c][move.r] = TicTacToe.CellState.nought;

    this.play_el.disabled = false;
    this.waiting_el.style.visibility = "hidden";
    this.game_state = TicTacToe.GameState.playing;
    this.queueDraw();
  },

  drawGrid: function()
  {
    this.createGridLayer();
  },

  getHighlight: function(coord)
  {
    var strokeWidth = 2;

    var config = {
      stroke: this.hover_color,
      listening: false
    };

    var highlight = new Kinetic.Rect(config);
    highlight.setPosition(coord.x, coord.y);
    highlight.setOffset(this.letter_radius - strokeWidth / 2, this.letter_radius - strokeWidth / 2);
    highlight.setWidth(this.letter_radius * 2 - strokeWidth);
    highlight.setHeight(this.letter_radius * 2 - strokeWidth);

    return highlight;
  },

  playerWon: function(data)
  {
    this.play_el.value = "You win! Play Again?";
    this.gameFinished(data);
  },

  noWinner: function()
  {
    this.play_el.value = "Draw! Play Again?";

    this.play_el.disabled = false;
    this.waiting_el.style.visibility = "hidden";

    this.gameFinished({
      cats_game: true
    });
  },

  cpuWon: function(data)
  {
    this.play_el.value = "You lose! Play Again?";
    this.gameFinished(data);
  },

  gameFinished: function(data)
  {
    this.game_state = TicTacToe.GameState.finished;

    if (data.cats_game) {
      this.drawCatsGame();
    } else {
      var start = this.gridPosToCanvasCoord(data.combination[0]);
      var end = this.gridPosToCanvasCoord(data.combination[2]);
      this.drawWinningLine(start, end);
    }

    this.queueDraw();
  },

  setRestartText: function()
  {
    this.play_el.disabled = true;
    this.play_el.value = "Restart";
  },

  resetGame: function()
  {
    this.drawingLayer.removeChildren();
    this.board = this.createEmptyGrid();
    this.mouse_state = TicTacToe.SelectionState.none;
    this.game_state = TicTacToe.GameState.playing;
    this.setRestartText();
    this.queueDraw();
  }
};

/*
 Provides requestAnimationFrame in a cross browser way.
 http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
window.requestAnimFrame = (function(callback) {
  return window.requestAnimationFrame  ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function() {
      window.setTimeout(callback, 1000 / 60);
    };
})();

// let's start the game
var game = new TicTacToe.Game("play", "tictactoe", "waiting");
game.start();
