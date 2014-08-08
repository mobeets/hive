var IMG_DIR = "images/"

var players = ["Player 1", "Player 2"];
var pieces = ["beetle", "ant", "grasshopper", "spider", "bee", "mosquito", "ladybug", "pillbug"];
var pieceLimits = {'beetle': 2, 'ant': 3, 'grasshopper': 3, 'spider': 2, 'bee': 1, 'mosquito': 1, 'ladybug': 1, 'pillbug': 1};
var curPiece = "beetle";

var whiteColor = '#FFF2DB';
var blackColor = '#3B3832';
var emptyColor = '#ADD8E6';
var strokeColor = '#ADD0E6';

var margin = {
    top: 0,
    right: -21,
    bottom: -38,
    left: 0
};
var MapColumns = 23,
    MapRows = 20;

var hexRadius = 25.0;
width = MapColumns*hexRadius*Math.sqrt(3);
height = MapRows*1.5*hexRadius+0.5*hexRadius;
points = makeHexPoints();
var hexbin = d3.hexbin().radius(hexRadius);
var hex_points = hexbin(points);
var extra_points = [];

var selectedHexRadius = hexRadius/1.05;
var selected_hexbin = d3.hexbin().radius(selectedHexRadius);

function makeHexPoints() {
    //Calculate the center positions of each hexagon
    pts = [];  
    for (var i = 0; i < MapRows; i++) {
        for (var j = 0; j < MapColumns; j++) {
            pts.push([hexRadius * j * 1.75, hexRadius * i * 1.5]);
        }
    }
    return pts;
}

// PLACEMENT LEGALITY
function hexAtInd(ind, ignoreTop) {
    // n.b. might be multiple pieces here if stacked; need to check the top one only
    // also give option for ignoring a piece at the top level?
    hexes = d3.selectAll('.hexagon').filter(function(d) { return d.i == ind[0] && d.j == ind[1]; });
    // return hexes;

    m = 0;
    hexes.each(function(d) { if (d.z > m) { m = d.z; }});
    if (ignoreTop) {
        return hexes.filter(function(d) { return d.z == m-1; });
    } else {
        return hexes.filter(function(d) { return d.z == m; });
    }
}
function hexIsOnTop(elem) {
    data = elem.data()[0];
    also_here_elem = hexAtInd([data.i, data.j], false);
    return hexIsEqual(elem, also_here_elem);
}
function hexWithData(data) {
    return d3.selectAll('.hexagon').filter(function(d) { return d == data; });
}
function hexAdjacentPieceInds(elem) {
    cur = elem.data()[0];
    adjs = [[cur.i-1, cur.j], [cur.i+1, cur.j], [cur.i, cur.j-1], [cur.i, cur.j+1]];
    adjs2 = [];
    if (getModTerm(elem) == 'even') {
        adjs2 = [[cur.i-1, cur.j-1], [cur.i-1, cur.j+1]];
    } else {
        adjs2 = [[cur.i+1, cur.j-1], [cur.i+1, cur.j+1]];
    }
    return adjs.concat(adjs2);
}
function hexCanBePlacedHere(elem, weakRules, isWhite, hexToIgnore) {
    // hexCanBePlacedHere(elem, isFirstMove(), isWhite)
    //      - used for initial placements
    // hexCanBePlacedHere(elem, true, false, cur)
    //      - used to ensure piece is touching something, not including cur
    touchesSomething = false;
    if (weakRules && isWhite) { return true; }

    adjs = hexAdjacentPieceInds(elem);
    // of all of these adjacent pieces:
    //  1. at least one must match pieceColor, unless weakRules is true
    //  2. and NONE may match the other pieceColor, unless weakRules is true
    foundSameColor = false;
    for (i in adjs) {
        adj = hexAtInd(adjs[i], false);
        if (hexToIgnore && hexIsEqual(adj, hexToIgnore)) { // look for piece under this one
            adj = hexAtInd(adjs[i], true);
        }
        // adj is in use and touches elem, and adj is not the hexToIgnore
        if (adj[0].length > 0 && !hexIsEmpty(adj)) {
            touchesSomething = true;
            // pieces match colors
            if (hexIsWhite(adj) == isWhite) {
                foundSameColor = true;
            }
            // pieces are different colors
            else if (!weakRules){
                return false;
            }
        }
    }
    return foundSameColor || (weakRules && touchesSomething);
}

// HEX PIECE
function hexHasPiece(elem) {
    return elem.attr("pieceName").length > 0;
}
function hexRemoveAll() {
    d3.selectAll('.hexagon').call(hexRemovePiece);
    noPieceSelected();
    updateGrid(true);
    extra_points = [];
}
function hexRemovePiece(elem) {
    // console.log('REMOVING at...');
    // console.log(elem.data()[0]);
    if (elem.data()[0].z > 0) {
        elem.data()[0].isAlive = false;
        elem.classed('REMOVEME', true);
    } else {
        elem.style('fill', emptyColor).classed('selected', false);
        elem.attr("pieceName", "");
        removePlayerType(elem);
    }
    checkPieceLimits();
}
function hexAddPiece(elem, pieceType, isNewPiece) {
    // console.log('ADDING at...');
    // console.log(elem.data()[0]);
    if (isNewPiece) {
        counts = countPieces(getPlayerIsWhite());
        isValid = counts[pieceType] < pieceLimits[pieceType];
        if (!isValid) { return; }
    }

    elem.style("fill", "url(" + getImgRef(elem, pieceType) + ")");
    elem.attr("pieceName", pieceType);

    addPlayerType(elem);
    updatePlayer();
    checkPieceLimits();
}

// HEX SELECTED
function hexUnselectAll() {
    d3.selectAll('.selected').classed('selected', false);
}
function hexIsSelected(elem) {
    return elem.classed('selected');
}
function hexSelect(elem) {
    hexUnselectAll();
    elem.classed('selected', true);
}
function hexUnselect(elem) {
    elem.classed('selected', false);
}
function hexToggleSelected(elem) {
    if (hexIsSelected(elem)) {
        hexUnselect(elem);
    }
    else if (getPlayerIsWhite() == hexIsWhite(elem)){
        hexSelect(elem);
    }
}
function hexIsWhite(elem) {
    return elem.classed('player-one');
}
function hexIsEmpty(elem) {
    return elem.attr("pieceName") == "";
}
function hexIsEqual(h1, h2) {
    return h1.data()[0] == h2.data()[0];
}
function hexAnotherAlreadySelected(elem) {
    var cur = d3.selectAll('.selected');
    if (cur[0].length == 0 || hexIsEqual(cur, elem)) { return false; }

    newPieceName = cur.attr("pieceName");

    // piece moving to empty clicked piece
    if (elem.attr("pieceName") == "") {
        // elem must touch something, not including cur
        if (hexCanBePlacedHere(elem, true, false, cur)) {
            hexRemovePiece(cur);
            hexAddPiece(elem, newPieceName, false);
        }
        // n.b. this beetle hexagon needs to be destroyed once it is moved
    }
    // beetle climbing on the clicked piece
    else if (newPieceName == 'beetle') {
        hexRemovePiece(cur);
        updateGrid();
        // n.b. need to destroy old beetle if it was already on top of another piece
        new_elem = addToGrid(elem, newPieceName);
        hexAddPiece(new_elem, newPieceName, false);
    }
    // unselecting the clicked piece
    else {
        hexUnselect(cur);
    }
    return true;
}

function clickHex(d) {
    elem = d3.select(this);
    // console.log(elem.data()[0]);
    if (!hexIsOnTop(elem)) { return; }

    // piece might be moving
    if (hexAnotherAlreadySelected(elem)){
    }
    // piece is being selected/unselected
    else if (hexHasPiece(elem)){
        hexToggleSelected(elem);
    }
    // new piece being added
    else if (hexCanBePlacedHere(elem, isFirstMove(), getPlayerIsWhite())){
        hexAddPiece(elem, curPiece, true);
    }
    updateGrid();
}
function mouseInHex(d) {
    d3.select(this).classed('hovered', true);
}
function mouseOutHex(d) { 
    d3.select(this).classed('hovered', false);
};


// IMAGES
function getModTerm(elem) {
    // different image needed depending upon which row the piece is on
    mod_term = 'odd';
    isEven = elem.data()[0].j % 2 == 0;
    if (isEven) { mod_term = 'even'; }
    return mod_term;
}
function getImgRef(elem, pieceType) {
    playerStr = 'black';
    if (getPlayerIsWhite()) { playerStr = 'white'; }
    return '#' + makeImgKey(playerStr, pieceType);
}
function makeImgKey(playerStr, pieceName) {
    return "img-piece-" + playerStr + "-" + pieceName;
}
function addImageDef(defs, pieceName, isWhite) {
    playerStr = 'black';
    if (isWhite) { playerStr = 'white'; }

    imgKey = makeImgKey(playerStr, pieceName);
    imgPath = IMG_DIR + pieceName + ".png";

    pattern = defs.append("pattern")
        .attr("id", imgKey)
        .attr("viewBox", "0 0 100 100")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 1)
        .attr("height", 1);

    col = playerStr == 'white' ? whiteColor : blackColor;
    pattern.append("rect")
        .attr("width", 100)
        .attr("y", -5)
        .attr("height", 110)
        .attr("fill", col);
    pattern.append("image")
        .attr("xlink:href", imgPath)
        .attr("x", 12)
        .attr("y", 8)
        .attr("width", 80)
        .attr("height", 80);
}

// BOARD
function dataPrepper(d) {
    d.z = 0;
    d.isAlive = true;
    return d;
}
function makeGrid(elem) {
    var svg = d3.select(elem).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var defs = d3.select("svg").append("defs");
    for (var i = 0; i < pieces.length; i++) {
        addImageDef(defs, pieces[i], true);
        addImageDef(defs, pieces[i], false);
    }
    
    //Start drawing the hexagons
    svg.append("g")
        .selectAll(".hexagon")
        .data(hex_points.map(dataPrepper))
        .enter()
        .append("path")
            .attr("class", "hexagon")
            .attr("pieceName", "")
            .attr("d", function (d) {
                return "M" + d.x + "," + d.y + selected_hexbin.hexagon();
            })
            .attr("stroke", strokeColor)
            .attr("stroke-width", "1px")
            .style("fill",  emptyColor)
            .on("mouseover", mouseInHex)
            .on("mouseout", mouseOutHex)
            .on("click", clickHex);
}
function makeElevatedHexData(elem) {
    newData = jQuery.extend({}, elem.data()[0]);
    newData.x = newData.x - 1;
    newData.y = newData.y - 4;
    newData.z = newData.z ? newData.z + 1 : 1;
    newData.isAlive = true;
    return newData;
}
function addToGrid(elem) {
    newData = makeElevatedHexData(elem);
    extra_points.push(newData);
    
    updateGrid();
    new_elem = hexWithData(newData);
    return new_elem;
}
function updateGrid(clear) {
    if (clear) {
        cur_points = hex_points;
        d3.select('.higher').classed('REMOVEME', true);
        // console.log('UPDATING (clearing) with total ' + cur_points.length);
    } else {
        ep1 = extra_points.length;
        extra_points = extra_points.filter(function(d) { return d.isAlive; });
        ep2 = extra_points.length;
        // if (ep2 != ep1) { console.log("REMOVING " + (ep1-ep2) + " upper hexagons."); }
        cur_points = hex_points.concat(extra_points);
        // console.log('UPDATING with extras: ' + extra_points.length + ' and total ' + cur_points.length);
    }
    var svg = d3.select("g").select("g")
        .selectAll(".hexagon")
        .data(cur_points);
    svg.enter()
        .append("path")
            .attr("class", "hexagon higher")
            .attr("pieceName", "")
            .attr("d", function (d) {
                return "M" + d.x + "," + d.y + selected_hexbin.hexagon();
            })
            .attr("stroke", strokeColor)
            .attr("stroke-width", "1px")
            .style("fill",  'white')
            .on("mouseover", mouseInHex)
            .on("mouseout", mouseOutHex)
            .on("click", clickHex);

    // I have no idea why this works, but selectAll(".hexagon") and filtering by .isAlive DOES NOT WORK in some situations
    // The below works. Don't ask me why.
    rems = d3.select(".REMOVEME").remove();
}

// PLAYERS
function isFirstMove() {
    if (getPlayerIsWhite()) {
        val = $('.player-one');
    } else {
        val = $('.player-two');
    }
    return val.length == 0;
}
function getPlayer() {
    return $('#player').html();   
}
function getPlayerIsWhite() {
    return getPlayer() == players[0];
}
function addPlayerType(elem) {
    isP1 = getPlayerIsWhite();
    elem.classed("player-one", isP1);
    elem.classed("player-two", !isP1);
}
function removePlayerType(elem) {
    elem.classed("player-one", false);
    elem.classed("player-two", false);
}
function updatePlayer() {
    col = !getPlayerIsWhite() ? whiteColor : blackColor;
    $('.pieces').css('background-color', col);
    // hexUnselectAll();
    ind = jQuery.inArray(getPlayer(), players);
    ind = (ind + 1) % players.length;
    $('#player').html(players[ind]);
    checkPieceLimits();
    noPieceSelected();
    hexUnselectAll();
}


// LOAD BOARD
function updateLogo() {
    $('.piece-spot').removeClass('piece-selected').addClass('piece-unselected');
    if (jQuery.inArray(curPiece, pieces) > -1) {
        obj = $('#' + curPiece).removeClass('piece-unselected').addClass('piece-selected');
    }
}
function hidePiece(pieceName, pieceColor) {
    $('#' + pieceName).css('visibility', 'hidden');
    $('#' + pieceName).click();
}
function unhidePiece(pieceName, pieceColor) {
    $('#' + pieceName).css('visibility', 'visible');
    $('#' + pieceName).click(updatePieceWithItemClick);
}
function countPieces(isWhite) {
    counts = {};
    for (i in pieces) {
        counts[pieces[i]] = 0;
    }
    sel = $('.player-two');
    if (isWhite) { sel = $('.player-one'); }
    val = sel
            .filter(function() { return $(this).attr("pieceName").length > 0; })
            .each(function(i, d) {
                piece = $(this).attr("pieceName");
                counts[piece] += 1;
        });
    return counts;
}
function checkPieceLimits(updateCurPiece) {
    isWhite = getPlayerIsWhite();
    col = isWhite ? 'white' : 'black';

    counts = countPieces(isWhite);
    availables = [];
    hiddens = [];
    for (i in pieceLimits) {
        if (counts[i] >= pieceLimits[i]) {
            hiddens.push(i);
            hidePiece(i, col);
        }
        else {
            availables.push(i);
            unhidePiece(i, col);
        }
    }
}
function noPieceSelected() { 
    curPiece = '';
    updateLogo();
}
function updatePieceWithItemClick(event) {
    val = $(this)[0].id;
    curPiece = val;
    updateLogo();
    hexUnselectAll();
}
$(function() {
    // $('#menu').css('');
    // $('#wrapper').css('width', '95%');
    // $('#content').css('padding-left', '100px');

    makeGrid('#chart');
    updateLogo();
    updatePlayer();
    
    // piece selection
    $('.piece-spot').click(updatePieceWithItemClick);

    // button actions
    $('#player').click(updatePlayer);
    $('#undo-button').click(function() { elem = d3.select('.selected'); hexRemovePiece(elem); updateGrid(); });
    $('#trash-button').click(hexRemoveAll);
});
