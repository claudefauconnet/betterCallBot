var fs = require('fs');
var xml2js = require('xml2js');
var jsonxml = require('jsontoxml');
var path = require('path');

var async = require('async');


var parser = new xml2js.Parser();


var skos = {





    loadSkosToTree: function (thesaurus, callback) {

        var file = path.resolve(__dirname ,thesaurus + ".rdf");
    //    var file = path.resolve(__dirname , "../../config/thesaurii/" + thesaurus + ".rdf");
        fs.readFile(file, function (err, data) {
            if (err) {
                if (callback)
                    return callback(err);
            }
            var parser = new xml2js.Parser();
            parser.parseString("" + data, function (err, result) {
                if (err) {
                    if (callback)
                        return callback(err);

                }

                var rdf="rdf:RDF";
            if(!result[rdf])
                rdf="rdf:Rdf"
                if(!result[rdf])
                    return callback("no RDF tag")


                var concepts = result[rdf]["skos:Concept"];
                var conceptsMap = {}
                for (var i = 0; i < concepts.length; i++) {
                    var about = concepts[i]["$"]["rdf:about"];
                    var id = about.substring(about.lastIndexOf("/") + 1)


                    var prefLabel = concepts[i]["skos:prefLabel"][0]
                    if(typeof  prefLabel ==="object")
                    prefLabel=prefLabel._
                    if (concepts[i]["skos:prefLabel"].length > 1) { // english for Unesco
                        prefLabel = concepts[i]["skos:prefLabel"][2]
                        if(typeof  prefLabel === "object")
                        prefLabel = prefLabel._
                    }


                    var node = {prefLabel: prefLabel}


                    if (concepts[i]["skos:narrower"])
                        node.narrower = concepts[i]["skos:narrower"]
                    if (concepts[i]["skos:NT"])
                        node.narrower = concepts[i]["skos:NT"]
                    if (concepts[i]["skos:broader"])
                        node.broader = concepts[i]["skos:broader"]
                    if (concepts[i]["skos:BT"])
                        node.broader = concepts[i]["skos:BT"]


                    node.synonyms = []
                    var altLabels=   concepts[i]["skos:altLabel"];
                    if(altLabels){
                        for(var j=0;j<altLabels.length;j++){
                            node.synonyms.push(altLabels[j]._)
                        }

                    }

                    conceptsMap[id] = node;



                }


                var treeData = []

                for (var key in conceptsMap) {
                    var concept = conceptsMap[key];
                    var node = {text: concept.prefLabel, id: key, data: {about: concept.about,synonyms:concept.synonyms}};

                    var parents = concept.broader;


                    if (parents && parents.length > 0) {
                        var parent = parents[0]["$"]["rdf:resource"]
                        var parent = parent.substring(parent.lastIndexOf("/") + 1)
                        //    var parent = conceptsMap[parent];
                        node.data.parentText = conceptsMap[parent].prefLabel;

                        if(typeof   node.data.parentText ==="object")
                            node.data.parentText=node.data.parentText._
                        node.parent = parent;


                    }
                    else {
                        node.parent ="#";// "_" + thesaurus;

                    }

                    treeData.push(node);

                }
               // treeData.push({text: thesaurus, id: "_" + thesaurus, parent: "#"});//root
                if (callback)
                    callback(null, treeData);
                return treeData;


            });
        });
    },

    saveTreeToSkos: function (treeData, ontology, callback) {
        var thesaurusUri = "http://www.souslesens.org/" + ontology;

        var synonyms = {}
        var concepts = {}

        for (var key in treeData) {

            var node = treeData[key];

            if (node.id=="#") {
                continue;
            }

            if (node.parent) {
                var concept = {
                    name: "skos:Concept",
                    attrs: {"rdf:about": "http://" + thesaurusUri + "/" + node.id}
                    , children: [
                        {
                            name: "skos:prefLabel",
                            text: node.text
                        },


                    ]


                }
                if (node.parent != "#") {
                    concept.children.push({
                        name: "skos:broader",
                        attrs: {"rdf:resource": "http://" + thesaurusUri + "/" + node.parent}
                    });
                }
                if (node.children) {
                    for (var i = 0; i < node.children.length; i++) {
                        concept.children.push({
                            name: "skos:narrower",
                            attrs: {"rdf:resource": "http://" + thesaurusUri + "/" + node.children[i]}
                        })

                    }
                }
                concepts[node.id] = concept;
            }

        }

        for (var conceptId in synonyms) {
            for (var i = 0; i < synonyms[conceptId].length; i++) {
                var synText = synonyms[conceptId][i].text;

                var concept = concepts["c_"+conceptId];
                concepts["c_"+conceptId].children.push(
                    {
                        name: "skos:altLabel",
                        text: synText
                    });

                if (concept) {// the synonym is already a concept
                    ;
                } else {// we create a concept for the synonym
                    ;
                }


            }
        }

     var conceptArray=[];
     for(var key in concepts){
         conceptArray.push(concepts[key])}


        var thesaurus = {};

        thesaurus["rdf:RDF"] = conceptArray;

        var xml = jsonxml(thesaurus, {indent: " ", prettyPrint: 1, xmlHeader: 1});
        var header =
            '<rdf:RDF' +
            ' xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"' +
            ' xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"' +
            '  xmlns:skos="http://www.w3.org/2004/02/skos/core#"' +
            '>'

        xml = xml.replace('<rdf:RDF>', header);
        var file = path.resolve(__dirname , "../../config/thesaurii/" + ontology + ".rdf");
        fs.writeFile(file, xml, {}, function (err, xml) {
            if (err)
                return callback(err);
            return (null, "thesaurus " + ontology + " saved")

        });
    }



}

module.exports = skos;