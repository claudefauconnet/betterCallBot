var express = require('express');
var router = express.Router();
var adaptativeCardRenderer = require("../bin/adaptativeCardRenderer..js")
var docxBot = require("../bin/docxBot..js")
var elasticQuery = require("../bin/nlp/elasticQuery..js")
var corpusAnalyzer = require("../bin/nlp/corpusAnalyzer..js")
/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});


router.post("/elastic", function (req, res, next) {
    if (req.body.queryString) {
        var fields = JSON.parse(req.body.fields);
        elasticQuery.searchWithQueryString(req.body.index, req.body.queryString, fields, req.body.size, function (err, result) {

            processResponse(res, err, result);

        })
    }
    if (req.body.search) {
       // if (!req.body.payload instanceof Object)
            var payload = JSON.parse(req.body.payload);
        elasticQuery.search(req.body.index, payload, function (err, result) {

            processResponse(res, err, result);

        })
    }


})
router.post("/analyzer", function (req, res, next) {
    if (req.body.extractConcepts) {
        var nouns = JSON.parse(req.body.nouns);
        corpusAnalyzer.getThesaurusConcepts(nouns, function (err, result) {
            processResponse(res, err, result);

        })
    }


})


router.post("/getCards", function (req, res, next) {
    docxBot.getCards(function (err, result) {

        processResponse(res, err, result);
    })


})


function processResponse(response, error, result) {
    if (response && !response.finished) {
        /* res.setHeader('Access-Control-Allow-Origin', '*');
         res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
         res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
         res.setHeader('Access-Control-Allow-Credentials', true); // If needed.setHeader('Content-Type', 'application/json');
         */
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
        response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
        response.setHeader('Access-Control-Allow-Credentials', true); // If needed


        if (error) {
            if (typeof error == "object") {
                error = JSON.stringify(error, null, 2);
            }
            console.log("ERROR !!" + error);

            response.status(404).send({ERROR: error});

        }
        else if (!result) {
            response.send({done: true});
        } else {

            if (typeof result == "string") {
                resultObj = {result: result};

                response.send(JSON.stringify(resultObj));
            }
            else {
                if (result.contentType && result.data) {
                    response.setHeader('Content-type', result.contentType);
                    if (typeof result.data == "object")
                        response.send(JSON.stringify(result.data));
                    else
                        response.send(result.data);
                }
                else {
                    var resultObj = result;
                    // response.send(JSON.stringify(resultObj));
                    response.send(resultObj);
                }
            }
        }


    }
}


module.exports = router;
