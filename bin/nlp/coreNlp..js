var async=require('async');
var request = require("request");
var coreNlp = {
   params: {
        //   url: "http://corenlp.run"
        //   url: "http://vps254642.ovh.net:9000/"  // to startup corenlp on vps made  crontab -e @reboot /var/lib/coreNlp/ceoreNlp.sh
        url: "http://localhost:9001/"


    },
    extractTokens: function (text,callback) {

             var  queryString = encodeURIComponent("properties={\"annotators\":\"tokenize,ssplit,lemma,pos\",\"outputFormat\":\"json\"}");
            var payload = text;



        request({
                url:  coreNlp.params.url + "?" + queryString,
                json: text,
                method: 'POST',
                headers: {'Content-Type': 'application/json',}
            },
            function (err, res) {

                if (err)
                    callback(err)
                else if (res.body && res.body.errors && res.body.errors.length > 0) {
                    console.log(JSON.stringify(res.body.errors))
                    callback(res.body.errors)
                }
                else
                    var json=res.body;


                            if (json) {

                                var tokens = coreNlp.parseCoreNlpJson(json);
                                 return callback(null,tokens);
                            }
                    })

    },



//extract nouns, verbs and numValues in the selected fragments
    parseCoreNlpJson : function (json) {
        var stopNouns=["title","undefined"]

        var nouns = [];
        var numValues = [];
        var verbs = [];
        var others=[];


        var sentences = json.sentences;
        if(!sentences)
            return null;
        for (var i = 0; i < sentences.length; i++) {
            var tokens = sentences[i].tokens


            for (var j = 0; j < tokens.length; j++) {

                if (j < tokens.length - 1 && tokens[j].pos == ("CD") && tokens[j + 1].pos.indexOf("NN") == 0) {
                    var matches = tokens[j].word.match(/\./g)
                    if (matches && matches.length > 1)
                        continue;

                    if (tokens[j + 1].word.length < 4) {
                        numValues.push({

                            word: (tokens[j].word + " " + tokens[j + 1].word),
                            pos: "CD",
                            index: tokens[j].index

                        })
                    }


                }

                else if (tokens[j].pos == ("MD") && (j < tokens.length - 1 && tokens[j + 1].pos.indexOf("V") == 0))
                    verbs.push({
                        word: (tokens[j].word + " " + tokens[j + 1].word),
                        pos: "CD",
                        index: tokens[j].index
                    })

                else if (tokens[j].pos == ("MD") && (j < tokens.length - 2 && tokens[j + 2].pos.indexOf("V") == 0))
                    verbs.push({
                        word: (tokens[j].word + " " + tokens[j + 1].word + " " + tokens[j + 2].word),
                        pos: "CD",
                        index: tokens[j].index
                    })


                if (tokens[j].pos.indexOf("NN") == 0) {
                    if (stopNouns.indexOf(tokens[j].word.toLowerCase()) < 0) {

                        nouns.push(tokens[j])
                    }
                }

                //  if (tokens[j].pos.indexOf("JJ") == 0 && tokens[j].word.indexOf("-")>0) {
                if (tokens[j].pos.indexOf("JJ") == 0) {
                    if (stopNouns.indexOf(tokens[j].word.toLowerCase()) < 0) {
                        nouns.push(tokens[j])
                    }
                }
                else {
                    if (stopNouns.indexOf(tokens[j].word.toLowerCase()) < 0) {
                        others.push(tokens[j])
                    }
                }


            }


        }

        return {nouns: nouns, verbs: verbs, numValues: numValues,others:others};
    },

    parseCoreNlpOpenieJson: function (json, tokens) {

    function getType(obj) {
        for (var i = 0; i < obj.objectSpan.length; i++) {
            if (tokens[obj.objectSpan[i]].pos == "CD")
                return "numValue";
        }
        return "noun";
    }

    var triples = []
    var sentences = json.sentences;
    for (var i = 0; i < sentences.length; i++) {
        var openies = sentences[i].openie;
        var tokens = sentences[i].tokens;
        for (var j = 0; j < openies.length; j++) {
            var obj = openies[j];
            var triple = {
                subject: obj.subject,
                relation: obj.relation,
                object: {name: obj.object, type: getType(obj, tokens)}
            }
            triples.push(triple);
        }
    }

    return triples;
},



}

module.exports = coreNlp;