
FLOLINK SERVICE APP
*******************

This app has 3 collections:
admins, users, devices and commands

It has the following APIs:
GET /sessions
  req: email,password,apikey
  res: session
DELETE /sessions
  req: session,apikey
  res: ack
GET /users
  req: session,limit
  res: users
POST /users
  req: user
  res: id
PUT /users
  req: user
  res: id
DELETE /users
  req: id
  res: ack
GET /devices
  req: session,limit
  res: devices
POST /devices
  req: device
  res: id
PUT /devices
  req: device
  res: id
DELETE /devices
  req: id
  res: ack
GET /commands
  req: session,limit
  res: commands
POST /commands
  req: command
  res: id
PUT /commands
  req: command
  res: id
DELETE /commands
  req: id
  res: ack
  
  
  
    // Insert examples
    // collection.insert(items, options, [callback]);
    // collection.insert({'hello':'item1'};
    // collection.insert({'hello':'item2'}, {w:1}, function(err, result) {});
    // var lotsOfItems = [{'hello':'item3'}, {'hello':'item4'}];
    // collection.insert(lotsOfItems, {w:1}, function(err, result) {});
    
    // Update examples
    // collection.update(criteria, objNew, options, [callback]);
    // collection.findAndModify(query, sort, update, options, callback);  only for single item
    // collection.update({hi: 'here'}, {$set: {hi: 'there'}}, {safe:true}, function(err) {
    //   if (err) console.warn(err.message);
    //   else console.log('successfully updated');
    // });
    
    // Remove examples
    // collection.remove({}, function(err, result) {});
    
    // Find examples
    // var cursor = collection.find(query, [fields], options);
    // cursor.sort(fields).limit(n).skip(m);
    // cursor.nextObject(function(err, item) {});
    // cursor.each(function(err, item) {});
    // cursor.toArray(function(err, items) {});
    // cursor.rewind();
    
    // one-to-many find example - category info for a product
    // products: {category_id: ObjectId("1")}
    // product = db.products.find(_id: some_id);
    // db.categories.find(_id: product.category_id);
    
    // many-to-many find example - all categories for a product
    // products: {category_ids: [ObjectId("1"), ObjectID("2")]}
    // product = db.products.find(_id: some_id);
    // db.categories.find({_id: {$in: product.category_ids}});