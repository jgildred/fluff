
// AIV SERIES ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app    = require('../../app'),
    Fluff  = app.Fluff,
    Plug   = require('./plug'),
    aws    = require('./aws-lib-0.2.1/lib/aws');

// Run after each series is checked - NOT USED YET
var loopNext = function (options, callback) {
  // Delay on each set of requests to comply with rate limited Amazon API
  var delay = 1000;
  // If there are more items left, do the next
  if ((options.index != null) && (options.array.length > (options.index + 1))) {
    setTimeout(function () {
      options.index++;
      checkSeriesLoop(options, callback);
    }, delay);
  }
  else {
    // This is called at the end of the loop
    if (callback) {
      callback();
    }
  }
};

var schema = "{\n\
  seriesname     : { type: String, required: true},   // No notes.\n\
  asin           : { type: String, required: true},   // No notes.\n\
  imageurl       : String,                            // No notes.\n\
  pageurl        : String,                            // No notes.\n\
  networkname    : String,                            // The cable or TV network.\n\
  creator_id     : ObjectId,                          // Required by Fluff.\n\
  lastupdater_id : ObjectId,                          // Required by Fluff.\n\
  creation       : { type: Date, default: Date.now }, // Required by Fluff.\n\
  lastupdate     : { type: Date, default: Date.now }  // Required by Fluff.\n\
}";

var display_columns = [{
  name:  'networkname',
  title: 'Network',
  size:  20
},
{
  name:  'seriesname',
  title: 'Series',
  size:  20
},
{
  name:  'imageurl',
  title: 'Image',
  type: 'image',
  size:  20
},
{
  name:  'pageurl',
  title: 'Page',
  size:  20
},
{
  name:  'asin',
  title: 'ID',
  size:  10
}];

var sort_column = { name:'seriesname', order:false };

// These may be used in plug.js for DB setup
exports.match_fields = ['seriesname'];
exports.schema = schema;

// Preprocessor for GET /aiv-series/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Users', null, function(){
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column
    }
    res.json(data);
  });
};

// Check each series in an array of series asins - NOT USED YET
var checkSeriesLoop = function(options, callback){
  if (options && options.asins && options.series) {
    options.index = options.index ? options.index : 0;
    var asin = options.asins[index];
    var item = options.series[index];
    console.log('Check series loop on ASIN ' + asin);
    http.get(item.pageurl, function(res) {
      if (res.statusCode != 200) {
        options.asins.splice(options.index, 1);
        options.series.splice(options.index, 1);
        options.index--;
      }
      console.log("Series check response: " + res.statusCode);
      loopNext(options);
    }).on('error', function(e) {
      console.log("Error checking series: " + e.message);
      loopNext(options, callback);
    });
  }
  else {
    console.log('No ARRAY for checkSeriesLoop.');
    loopNext(options, callback);
  }
};

// Preprocessor for GET /aiv-series?keyword=:keyword
exports.findbykeyword = function(req, res){
  app.doIfHasAccess(req, res, 'Users', null, function(){
    if (req.query.keyword) {
      var prodAdv = aws.createProdAdvClient(Fluff.awsAccessKeyId, Fluff.awsSecretAccessKey, Fluff.awsAssociatesId);
      // Find any matching episodes based on title
      prodAdv.call("ItemSearch", {SearchIndex: "UnboxVideo", Keywords: req.query.keyword, ResponseGroup: "ItemAttributes, RelatedItems", RelationshipType: "Episode"}, function(err, result) {
        var matchedEpisodes = [], seasonASINs = [], seriesASINs = [], matchedSeries = [];
        console.log("Getting search results for " + req.query.keyword + "...");
        console.log("DATA:");
        console.log(JSON.stringify(result));
        if (result.ItemSearchResponse) {
          result.ItemSearchResponse.Items[0].Item.forEach(function (item) {
            // Make sure it's an episode
            console.log("episode == " + item.ItemAttributes[0].Title[0] + " " + item.ASIN[0]);
            if ((item.ItemAttributes[0].ProductTypeName[0] == "DOWNLOADABLE_TV_EPISODE") && 
              (item.RelatedItems[0].Relationship[0] == "Parents") && 
              (item.RelatedItems[0].RelationshipType[0] == "Episode")) {
              // Go through the related items to find it's season
              item.RelatedItems[0].RelatedItem[0].Item.forEach(function (season) {
                // Make sure it's related item is a season and it's not one we've seen before
                if ((season.ItemAttributes[0].ProductTypeName[0] == "DOWNLOADABLE_TV_SEASON") && (seasonASINs.indexOf(season.ASIN[0]) == -1)) {
                  seasonASINs.push(season.ASIN[0]);
                }
              });
            }
          });
          if (seasonASINs.length > 0) {
            // Limit it to 10 as that is the max the lookup will allow
            if (seasonASINs.length > 10) {
              seasonASINs = seasonASINs.splice(9);
            }
            var asinString = seasonASINs.join(',');
            // Get the series info from the season lookup
            prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: asinString, ResponseGroup: "ItemAttributes, RelatedItems, Images", RelationshipType: "Season"}, function(err, result) {
              console.log("Looking up related items for seasons...");
              if (result.ItemLookupResponse) {
                result.ItemLookupResponse.Items[0].Item.forEach(function (item) {
                  console.log("season == " + item.ItemAttributes[0].Title[0] + " " + item.ASIN[0]);
                  if ((item.ItemAttributes[0].ProductTypeName[0] == "DOWNLOADABLE_TV_SEASON") &&
                    (item.RelatedItems[0].Relationship[0] == "Parents") && 
                    (item.RelatedItems[0].RelationshipType[0] == "Season")) {
                    // Go through the related items to find it's series
                    item.RelatedItems[0].RelatedItem[0].Item.forEach(function (series) {
                      // Make sure it's related item is a series we haven't seen before
                      if ((series.ItemAttributes[0].ProductTypeName[0] == "DOWNLOADABLE_TV_SERIES") && (seriesASINs.indexOf(series.ASIN[0]) == -1)) {
                        seriesASINs.push(series.ASIN[0]);
                        matchedSeries.push({
                          asin: series.ASIN[0],
                          imageurl: item.SmallImage ? item.SmallImage[0].URL[0] : ""
                        });
                      }
                    });
                  }
                });
                if (seriesASINs.length > 0) {
                  asinString = seriesASINs.join(',');
                  // Lookup the series info
                  // RESULTS MAY BE FALSE, MUST HIT EACH PAGE URL TO CHECK FOR 404
                  // RESULTS MAY NOT HAVE IMAGES, IF NOT USE SEASON IMAGE
                  prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: asinString, ResponseGroup: "ItemAttributes, Images"}, function(err, result) {
                    console.log("Getting series metadata...");
                    if (result.ItemLookupResponse) {
                      result.ItemLookupResponse.Items[0].Item.forEach(function (item) {
                        console.log("series == " + item.ItemAttributes[0].Title[0] + " " + item.ASIN[0]);
                        // Fill in the rest of the data
                        matchedSeries.forEach(function (series) {
                          if (series.asin == item.ASIN[0]) {
                            series.networkname = item.ItemAttributes[0].Studio[0];
                            series.pageurl = item.DetailPageURL[0];
                            series.seriesname = item.ItemAttributes[0].Title[0];
                          }
                        });
                      });
                      console.log("Sending back the series data...");
                      res.json(matchedSeries);
                      console.log("DONE");
                    }
                    else {
                      res.json({message: "problem getting series: ", error: err ? err : result.ItemLookupErrorResponse});
                    }
                  });
                }
                else {
                  res.json({message: "no series found"});
                }
              }
              else {
                res.json({message: "problem getting seasons: ", error: err ? err : result.ItemLookupErrorResponse});
              }
            });
          }
          else {
            res.json({message: "no seasons found"});
          }
        }
        else {
          res.json({message: "can't access Amazon"});
        }
      });
    }
    else {
      res.json({message: "no keyword"});
    }
  });
};
