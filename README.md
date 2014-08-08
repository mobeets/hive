A javascript/jquery/d3 implementation of the board game [Hive](http://www.gen42.com/hive).

Allows two players on the same computer to play Hive.

Kinda.

Currently, the game allows many illegal moves. It is up to the users, for the most part, to keep the game legal. Rules can be found [here](http://www.gen42.com/downloads/rules/Hive_Rules.pdf).

### RULES ENFORCED
* white goes first
* piece placement
    * if white's first move, piece can go anywhere
    * if black's first move, piece must touch white's first move
    * otherwise, piece must touch at least one piece of own color and none of opponent's color
* limited # of pieces (e.g. only three ants per player)
* movement rules
    * piece's new location must touch another piece on the board
* only beetles can climb onto pieces

### RULES NOT ENFORCED
* I have no idea what mosquitos, pillbugs, or ladybugs do.
* movement rules
    * all pieces on board must remain connected when moving a piece
    * given starting location ptX, define a distance function d(ptX, ptY)
        * if ptY is occupied, d(ptX, ptY) = inf.
        * if ptY is touching ptX, d(ptX, ptY) = 1 iff there exists a ptZ touching both ptX and ptY
        * Then ptX can move to ptY iff d(ptX, ptY) = C, where C is finite
