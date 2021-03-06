var fill = d3.scale.category20b();

var w = window.innerWidth, h = window.innerHeight;
w -= 0;
h -= 60;
var max, fontSize;
var tags = [];

var font = 'impact';
var spiral = 'rectangular';
var rotation = 'random 30';
var text;


var layout = d3.layout.cloud().timeInterval(Infinity).size([ w, h ]).fontSize(function(d) {
	return fontSize(+d.value);
}).text(function(d) {
	return d.key;
}).on("end", draw);

var svg = d3.select("#vis").append("svg").attr("width", w).attr("height", h);

var vis = svg.append("g").attr("transform", "translate(" + [ w >> 1, h >> 1 ] + ")");

// update();

window.onresize = function(event) {
	update();
};

function draw(data, bounds) {
	var w = window.innerWidth, h = window.innerHeight;
	w -= 0;
	h -= 60;
	
	svg.attr("width", w).attr("height", h);

	scale = bounds ? Math.min(w / Math.abs(bounds[1].x - w / 2), w / Math.abs(bounds[0].x - w / 2), h / Math.abs(bounds[1].y - h / 2), h / Math.abs(bounds[0].y - h / 2)) / 2 : 1;
	if($("#cloudFont")){
		font = $("#cloudFont").val();
		spiral = $("#cloudSpiral").val();
		rotation = $("#cloudRotation").val();
		
	}
	var text = vis.selectAll("text").data(data, function(d) {
		return d.text.toLowerCase();
	}).attr("class", "cloud-text");
	text.transition().duration(1000).attr("transform", function(d) {
		return "translate(" + [ d.x, d.y ] + ")rotate(" + d.rotate + ")";
	}).style("font-size", function(d) {
		return d.size + "px";
	});
	text.enter().append("text").attr("text-anchor", "middle").attr("transform", function(d) {
		return "translate(" + [ d.x, d.y ] + ")rotate(" + d.rotate + ")";
	}).style("font-size", function(d) {
		return d.size + "px";
	}).style("opacity", 1e-6).transition().duration(1000).style("opacity", 1);
	text.style("font-family", function(d) {
		return d.font;
	}).style("fill", function(d) {
		return fill(d.text.toLowerCase());
	}).text(function(d) {
		return d.text;
	}).on("dblclick", dblclickText).on("click", clickText);

	vis.transition().attr("transform", "translate(" + [ w >> 1, h >> 1 ] + ")scale(" + scale + ")");
}

function update() {
	if($("#cloudFont")){
	font = $("#cloudFont").val();
	spiral = $("#cloudSpiral").val();
	rotation = $("#cloudRotation").val();
	$("#tabs-tagCloud").tabs("option", "active", 0);
}
else{
	var font = 'impact';
	var spiral = 'rectangular';
	var rotation = 'horizontal';
}

	layout.font(font).spiral(spiral);
	fontSize = d3.scale['sqrt']().range([ 10, 100 ]);
	if (tags.length) {
		fontSize.domain([ +tags[tags.length - 1].value || 1, +tags[0].value ]);
	}
	layout.stop().words(tags).start();
}

function clickText() {
	// alert(this);

	var e = d3.event;

	if (e.ctrlKey) {
		var word = [ this.__data__.key ];
		var filter = $("#filter").val();

		$("#filter2").val(filter + "," + word);
		$("#filter").val(filter + "," + word);
		setTimeout(function (){drawTagCloud();},100);
		
		
	} else {
		var word = [ this.__data__.key ];
		var filter = $("#filter").val();
		$("#filter2").val(filter + "," + word);
		$("#filter").val(filter + "," + word);
		$("#tabs-tagCloud").tabs("option", "active", 2);
		getTagLinks( filter + "," + word );
	}

}

function dblclickText() {

}