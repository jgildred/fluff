
// NOW PLAYING ROUTE HANDLER

// This is a very simple route handler. You will most likely want to add to it.

var app         = require('../../app'),
    Fluff       = app.Fluff,
    Plug        = require('./plug'),
    resource    = require('../../routes/resource'),
    watchlist   = require('./watchlist'),
    aws         = require('./aws-lib-0.2.1/lib/aws');

var schema = "{\n\
  user_id        : ObjectId,                          // The owner.\n\
  seriesname     : { type: String, required: true},   // No notes.\n\
  seasonname     : String,                            // No notes.\n\
  seasonnumber   : String,                            // No notes.\n\
  episodename    : String,                            // No notes.\n\
  episodenumber  : String,                            // No notes.\n\
  asin           : { type: String, required: true},   // No notes.\n\
  seriesasin     : { type: String, required: true},   // No notes.\n\
  imageurl       : String,                            // No notes.\n\
  pageurl        : String,                            // No notes.\n\
  networkname    : String,                            // The cable or TV network.\n\
  releasedate    : { type: String, required: true},   // Release date.\n\
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
  name:  'seasonnumber',
  title: 'Season Number',
  size:  10
},
{
  name:  'episodenumber',
  title: 'Episode Number',
  size:  10
},
{
  name:  'episodename',
  title: 'Episode Name',
  size:  20
},
{
  name:  'releasedate',
  title: 'Release Date',
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
  size:  20
}];

var sort_column = { name:'releasedate', order:false };

// These are used in plug.js
exports.matchfields = ['seriesname'];
exports.schema = schema;

// Preprocessor for GET /nowplaying
exports.find = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.NowPlaying, function(req, res, resourceScope) {
    var filter = {user_id: req.session.user_id};
    var sort = '-releasedate';
    resource.find(req, res, resourceScope, filter, null, sort);
  });
};

// Preprocessor for GET /nowplaying/info
exports.getinfo = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.NowPlaying, function(req, res) {
    var data = {
      schema_data     : schema,
      display_columns : display_columns,
      sort_column     : sort_column
    }
    res.json(data);
  });
};

// Preprocessor for GET /nowplaying/:id
exports.findone = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.NowPlaying, resource.findone);
};

// Preprocessor for POST /nowplaying/refresh
exports.refresh = function(req, res){
  app.doIfHasAccess(req, res, 'Owner', Plug.NowPlaying, function(req, res) {
    // get watchlist for current user
    // loop thru to get latest episode for each
    // delete nowplaying list for current user
    // save new nowplaying list for current user
    Plug.Watchlist.find({user_id: req.session.user_id}).exec(function (err, watchlist) {
      if (err) {
        app.msgResponse(req, res, 500, 'Could not get the watchlist.');
      }
      else {
        Plug.NowPlaying.remove({user_id: req.session.user_id}, function (err, data) {
          if (err) {
            app.msgResponse(req, res, 500, 'Could not clear the now playing list.');
          }
          else { 
            if (watchlist && watchlist.length > 0) {
              var asins = watchlist.map(function(item){
                return item.asin;
              });
              nowPlayingLoop(asins, 0);
              res.json({
                msg: "Refresh started, see 'wait' value for expected wait time in seconds.",
                wait: watchlist.length * 3
              });
            }
            else {
              app.msgResponse(req, res, 200, 'Nothing in the watchlist yet.');
            }
          }
        });
      }
    });
  });
};

// Run after each episode is recorded
var loopNext = function (array, index, callback) {
  // Delay on each set of requests to comply with rate limited Amazon API
  var delay = 1000;
  // If there are more items left, do the next
  if ((index != null) && (array.length > (index + 1))) {
    setTimeout(function () {
      nowPlayingLoop(array, index + 1, callback);
    }, delay);
  }
  else {
    // This is called at the end of the loop
    if (callback) {
      callback();
    }
  }
}

// Records the last released episode for each series in an array of series asins
var nowPlayingLoop = function(array, index, callback){
  if (array) {
    index = index ? index : 0;
    var asin = array[index];
    console.log('Now playing loop on ASIN ' + asin);
    var prodAdv = aws.createProdAdvClient(Fluff.awsAccessKeyId, Fluff.awsSecretAccessKey, Fluff.awsAssociatesId);
    prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: asin, ResponseGroup: "ItemAttributes, RelatedItems", RelationshipType: "Season"}, function(err, result) {
      if (result.ItemLookupResponse) {

        var seriesName = result.ItemLookupResponse.Items[0].Item[0].ItemAttributes[0].Title[0];
        console.log('Got series lookup response for ' + seriesName);
        // Check if the series has any seasons
        var latestSeason = 0, latestSeasonASIN = null;
        result.ItemLookupResponse.Items[0].Item[0].RelatedItems.forEach(function (relateditem) {
          if ((relateditem.Relationship[0] == "Children") && 
            (relateditem.RelationshipType[0] == "Season")) {
            relateditem.RelatedItem.forEach(function (season) {
              if (parseInt(season.Item[0].ItemAttributes[0].EpisodeSequence[0]) &&
                (parseInt(season.Item[0].ItemAttributes[0].EpisodeSequence[0]) > latestSeason)) {
                latestSeason = parseInt(season.Item[0].ItemAttributes[0].EpisodeSequence[0]);
                latestSeasonASIN = season.Item[0].ASIN[0];
              }
            });
          }
        });
        if (latestSeason == 0) {
          console.log('NO latest season for ' + seriesName + ' with ASIN ' + latestSeasonASIN);
          loopNext(array, index, callback);
        }
        else {
          console.log('Got latest season for ' + seriesName + ' with ASIN ' + latestSeasonASIN);
          prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: latestSeasonASIN, ResponseGroup: "ItemAttributes, RelatedItems", RelationshipType: "Episode"}, function(err, result) {
            if (result.ItemLookupResponse) {
              var seasonName = result.ItemLookupResponse.Items[0].Item[0].ItemAttributes[0].Title[0];
              console.log('Got season lookup response for ' + seasonName);
              // Check if the season has any episodes
              var latestEpisode = 0, latestEpisodeASIN = null;
              result.ItemLookupResponse.Items[0].Item[0].RelatedItems.forEach(function (relateditem) {
                if ((relateditem.Relationship[0] == "Children") && 
                  (relateditem.RelationshipType[0] == "Episode")) {
                  relateditem.RelatedItem.forEach(function (episode) {
                    if (parseInt(episode.Item[0].ItemAttributes[0].EpisodeSequence[0]) &&
                      (parseInt(episode.Item[0].ItemAttributes[0].EpisodeSequence[0]) > latestEpisode)) {
                      latestEpisode = parseInt(episode.Item[0].ItemAttributes[0].EpisodeSequence[0]);
                      latestEpisodeASIN = episode.Item[0].ASIN[0];
                    }
                  });
                }
              });
              if (latestEpisode == 0) {
                console.log('NO latest episode for ' + seasonName);
                loopNext(array, index, callback);
              }
              else {
                console.log('Got latest episode for ' + seasonName);
                prodAdv.call("ItemLookup", {IdType: "ASIN", ItemId: latestEpisodeASIN, ResponseGroup: "ItemAttributes, Images"}, function(err, result) {
                  if (result.ItemLookupResponse) {
                    console.log('Got episode lookup response for ' + seriesName);
                    var test = result.ItemLookupResponse.Items[0].Item[0].SmallImage[0];
                    var nowPlayingItem = {
                      asin: result.ItemLookupResponse.Items[0].Item[0].ASIN[0],
                      networkname: result.ItemLookupResponse.Items[0].Item[0].ItemAttributes[0].Studio[0],
                      episodenumber: result.ItemLookupResponse.Items[0].Item[0].ItemAttributes[0].EpisodeSequence[0],
                      episodename: result.ItemLookupResponse.Items[0].Item[0].ItemAttributes[0].Title[0],
                      releasedate: result.ItemLookupResponse.Items[0].Item[0].ItemAttributes[0].ReleaseDate[0],
                      imageurl: result.ItemLookupResponse.Items[0].Item[0].SmallImage[0].URL[0],
                      pageurl: result.ItemLookupResponse.Items[0].Item[0].DetailPageURL[0],
                      seasonname: seasonName,
                      seasonnumber: latestSeason,
                      seriesname: seriesName,
                      seriesasin: asin,
                      user_id: Fluff.user.id
                    };
                    console.log('SAVING NOWPLAYING ITEM: ' + nowPlayingItem.seriesname);
                    Plug.NowPlaying.create(nowPlayingItem, function (err, data) {
                      loopNext(array, index, callback);
                    });
                  }
                  else {
                    console.log('NO episode lookup response for ' + latestEpisodeASIN);
                    console.log(JSON.stringify(result.ItemLookupErrorResponse.Error));
                    loopNext(array, index, callback);
                  }
                });
              }
            }
            else {
              console.log('NO season lookup response for ' + latestSeasonASIN);
              console.log(JSON.stringify(result.ItemLookupErrorResponse.Error));
              loopNext(array, index, callback);
            }
          });
        }
      }
      else {
        console.log('NO series lookup response for ' + asin);
        console.log(JSON.stringify(result.ItemLookupErrorResponse.Error));
        loopNext(array, index, callback);
      }
    });
  }
  else {
    console.log('No ARRAY for nowPlayingLoop.');
    loopNext(array, index, callback);
  }
};
