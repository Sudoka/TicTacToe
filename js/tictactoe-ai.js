
var TicTacToe_AI = function tic_tac_toe_ai(game) {

  if ( !(this instanceof tic_tac_toe_ai) ) {
    return new TicTacToe_AI(game);
  }

  var TicTacToe = {
    CellState: {
      empty: 0,
      cross: 'X',
      nought: 'O'
    },
    Players: {
      human: 'X',
      cpu: 'O'
    },
    Positions: {
      winning: 1000,
      losing: -1000,
      neutral: 0
    }
  }

  // Private member variables
  var _game = game,
      _context = this;

  // Private method to return the best move for
  // the current player and board state.
  var _bestMove = function(player, board)
  {
    // use objects so we can pass them in by reference
    var best_move = { };

    var state = {
      player: player,
      board: board
    };

    _maxMove(state, best_move);

    return best_move;
  };

  // Finds the optimal tic-tac-toe move for the current
  // player given the specified state, using an implementation
  // based off the minimax algorithm found in Russel Norvig's
  // book on Artificial Intelligence.
  var _maxMove = function(state, bestMove)
  {
    // check the current status of the game
    var gameState = _context.gameState(state.board);

    // if game is finished, return score based on static position
    if (gameState.winner || gameState.draw) {
      return _evaluateStaticPosition(state, gameState);
    }

    // get a list of all possible moves for the current state
    var move_list = _possibleMoves(state);

    var score = TicTacToe.Positions.losing;

    for(var i = 0 ; i < move_list.length; i++) {
      var move = move_list[i];

      _makeMove(state, move);

      var opponents_best_move = { };

      var opponents_worst_score = -1 * _maxMove(state, opponents_best_move);

      if (opponents_worst_score > score) {
        score = opponents_worst_score;
        bestMove.move = move;
      }

      _retractMove(state, move);
    }
    return score;
  };

  var _makeMove = function(state, move)
  {
    state.board.grid[move.c][move.r] = state.player;

    // we need to switch the player state after a move is made
    state.player = (state.player == TicTacToe.Players.human) ?
      TicTacToe.Players.cpu : TicTacToe.Players.human
  };

  var _retractMove = function(state, move)
  {
    state.board.grid[move.c][move.r] = TicTacToe.CellState.empty;

    // we need to switch the player state after a move is retracted
    state.player = (state.player == TicTacToe.Players.human) ?
      TicTacToe.Players.cpu : TicTacToe.Players.human
  };

  // We need to calculate a score indicating how good the board
  // state is for the current player.
  var _evaluateStaticPosition = function(state, gameState)
  {
    if (!gameState.winner) {
      return TicTacToe.Positions.neutral;
    } else if(state.player == gameState.winner) {
      return TicTacToe.Positions.winning;
    } else {
      return TicTacToe.Positions.losing;
    }
  }

  // Returns a list of all possible moves based on the
  // specified state of the game.
  var _possibleMoves = function(state)
  {
    var moves = [], grid = state.board.grid;

    for (var c = 0; c < state.board.gridSize.cols; c++) {
      for (var r = 0; r < state.board.gridSize.rows; r++) {
        if (grid[c][r] === TicTacToe.CellState.empty) {
          moves.push({
            c: c,
            r: r
          })
        }
      }
    }

    return moves;
  };

  // Returns an object with info about the state of the game. If the
  // game is over, the object will specify either the winner and the pattern that won
  // or that the game was a draw.
  // If the game is not over, the object will specify that the game is ongoing.
  this.gameState = function(board)
  {
    if (!board || !board.grid) {
      return;
    }

    // all possible winning patterns
    var _combinations = [
      [{ c: 0, r: 0 }, { c: 1, r: 0}, { c: 2, r: 0 }], // Horizontal Top
      [{ c: 0, r: 1 }, { c: 1, r: 1}, { c: 2, r: 1 }], // Horizontal Middle
      [{ c: 0, r: 2 }, { c: 1, r: 2}, { c: 2, r: 2 }], // Horizontal Bottom

      [{ c: 0, r: 0 }, { c: 0, r: 1}, { c: 0, r: 2 }], // Vertical Left
      [{ c: 1, r: 0 }, { c: 1, r: 1}, { c: 1, r: 2 }], // Vertical Middle
      [{ c: 2, r: 0 }, { c: 2, r: 1}, { c: 2, r: 2 }], // Vertical Right

      [{ c: 0, r: 0 }, { c: 1, r: 1}, { c: 2, r: 2 }], // Diagonal Down
      [{ c: 0, r: 2 }, { c: 1, r: 1}, { c: 2, r: 0 }]  // Diagonal Up
    ];

    var grid = board.grid;

    // we need to check rows, columns, and diagonals for a winner
    for (var i = 0; i < _combinations.length; i++) {
      var combination = '';

      for (var j = 0; j < _combinations[i].length; j++) {
        var cell = _combinations[i][j];
        combination += grid[cell.c][cell.r];
      }

      var cross = TicTacToe.CellState.cross,
        nought = TicTacToe.CellState.nought;

      if (combination == cross + cross + cross ||
        combination == nought + nought + nought) {
        return {
          winner: combination[0],
          combination: _combinations[i]
        };
      }
    }

    // if we don't have a winner, check if the game is ongoing
    for (var c = 0; c < board.gridSize.cols; c++) {
      for (var r = 0; r < board.gridSize.rows; r++) {
        if (grid[c][r] === TicTacToe.CellState.empty) {
          return {
            ongoing: true
          };
        }
      }
    }

    // the game is finished with no winner so we must have a draw
    return {
      draw: true
    };
  };

  this.bestMove = function(player, board)
  {
    return _bestMove(player, board);
  };

  this.getNextGameState = function(board)
  {
    // we need to check to see if the game is finished
    var gameState = this.gameState(board);

    if (gameState.winner) {
      _game.playerWon(gameState);
    }
    else if (gameState.draw) {
      _game.noWinner();
    }
    else if (gameState.ongoing) {

      var best = this.bestMove('O', board);

      // make move
      board.grid[best.move.c][best.move.r] = 'O';

      // check the game state again now that the CPU has moved
      gameState = this.gameState(board);

      if (gameState.winner) {
        _game.cpuMove(best.move);
        _game.cpuWon(gameState);
      }
      else if (gameState.draw) {
        _game.cpuMove(best.move);
        _game.noWinner();
      }
      else if (gameState.ongoing) {
        _game.cpuMove(best.move);
      }
    }
  };
}