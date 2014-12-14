
// SEED DATA

var users = [{
"firstname": "Test",
"lastname": "User1",
"orgname": "None",
"email": "test-user1@flolink.co",
"pwhash": "xxx",
"apikey": "1111111111",
"phone": "5101111111",
"status": "active"
},{
"firstname": "Test",
"lastname": "User2",
"orgname": "None",
"email": "test-user2@flolink.co",
"pwhash": "xxx",
"apikey": "2222222222",
"phone": "5101111111",
"status": "active"
},{
"firstname": "Test",
"lastname": "User3",
"orgname": "None",
"email": "test-user3@flolink.co",
"pwhash": "xxx",
"apikey": "3333333333",
"phone": "5101111111",
"status": "active"
},{
"firstname": "Test",
"lastname": "User",
"orgname": "None",
"email": "test-user@flolink.co",
"pwhash": "xxx",
"apikey": "0000000000",
"phone": "5101111111",
"status": "active",
"shipping": {
  "status": "delivered", 
  "addressline1": "123 FloLink Rd.",
  "addressline2": "Apartment B",
  "city": "Oakland",
  "stateregion": "CA",
  "country": "USA",
  "postalcode": "94600" },
"billing": {
  "status": "up to date",
  "addressline1": "456 LinkFlo St.",
  "city": "Oakland",
  "stateregion": "CA",
  "country": "USA",
  "postalcode": "94100" },
"payment": {
  "status": "up to date",
  "type": "visa",
  "owner": "Test A. User",
  "account": "xxxx-xxxx-xxxx-1234",
  "expires": "10-16",
  "securitycode": "123" }
}]


var devices = [{
"uid": "3k5jh343hk34jh2k3jf",
"name": "Main Switch", 
"type": "switch", 
"manufacturer": "FloLink",
"model": "Brick",
"serialno": "001",
"firmware": "2.1.0",
"status": "running"
},{
"uid": "45rigue9r8y34iufhekf",
"name": "Main Switch", 
"type": "switch", 
"manufacturer": "FloLink",
"model": "Brick",
"serialno": "002",
"firmware": "2.1.0",
"status": "running"
},{
"uid": "o34it3948g98hwefw23r2f",
"name": "Main Switch", 
"type": "switch", 
"manufacturer": "FloLink",
"model": "Brick",
"serialno": "003",
"firmware": "2.1.0",
"status": "running"
},{
"uid": "k45jyh38rwg9834hf2wef43",
"name": "Main Switch", 
"type": "switch", 
"manufacturer": "FloLink",
"model": "Brick",
"serialno": "004",
"firmware": "2.1.0",
"status": "running", 
"capabilities": ["switch", "avb", "vlans", "router", "ap", "dns", "dhcp"],
"commands": ["restart", "rename", "firmware", "setports", "setstreams", "setvlans", "setroutes", "setap", "setdns", "setdhcp"],
"ports": [{
  "id": "P0",
  "number": 1, 
  "mac": "00:00:00:00:00:00", 
  "media": "1000BASE-T", 
  "speed": "1000",
  "status": "link",
  "avb": "yes",
  "poe": "yes",
  "type": "lan"
  },{
  "id": "P1",
  "number": 2, 
  "mac": "00:00:00:00:00:00", 
  "media": "1000BASE-T", 
  "speed": "1000",
  "status": "link",
  "avb": "yes",
  "poe": "yes",
  "type": "lan"
  },{
  "id": "P2",
  "number": 3, 
  "mac": "00:00:00:00:00:00", 
  "media": "1000BASE-T", 
  "speed": "1000",
  "status": "link",
  "avb": "yes",
  "poe": "yes",
  "type": "lan"
  },{
  "id": "P3",
  "number": 4, 
  "mac": "00:00:00:00:00:00", 
  "media": "1000BASE-T", 
  "speed": "1000",
  "status": "link",
  "avb": "yes",
  "poe": "yes",
  "type": "lan"
  },{
  "id": "P4",
  "number": 5,
  "mac": "00:00:00:00:00:00",
  "media": "1000BASE-T",
  "speed": "1000",
  "status": "link",
  "avb": "yes",
  "poe": "yes",
  "type": "lan"
  },{
  "id": "WAN0",
  "mac": "00:00:00:00:00:00",
  "media": "1000BASE-T",
  "speed": "1000",
  "status": "link",
  "avb": "no",
  "poe": "no",
  "type": "wan" }],
"routes": [{
  "source": "000.000.000.000",
  "dest": "000.000.000.000",
  "gateway": "000.000.000.000",
  "mask": "000.000.000.000"}],
"nats": [{
  "port": 80,
  "dest": "000.000.000.000" }],
"vlans": [{
  "id": "V0",
  "ports": ["P1", "P2"]
  },{
  "id": "V1",
  "ports": ["P0", "P3", "P4"]}],
"streams": [{
  "id": "S0",
  "size": "10000000",
  "talker": "00:00:00:00:00:00",
  "ingress": "P4",
  "listeners": [{
    "mac": "00:00:00:00:00:00",
    "egress": "P0"
    },{
    "mac": "00:00:00:00:00:00",
    "egress": "P3" }] }],
"ap": {
  "networkid": "Home Wifi",
  "mode": "extended",
  "mac": "00:00:00:00:00:00",
  "media": "802.11",
  "compatibility": "bgn",
  "speed": "100",
  "status": "active",
  "avb": "no",
  "status": "active",
  "security": {
    "type": "WPA2-P",
    "key": "1234567890" },
  "clients": [{
    "mac": "00:00:00:00:00:00",
    "ip": "000.000.000.000"
    },{
    "mac": "00:00:00:00:00:00",
    "ip": "000.000.000.000" }] },
"dns": {
  "status": "active",
  "servers": [
    "000.000.000.000",
    "000.000.000.000" ],
  "search_domains": ["local"] },
"dhcp": {
  "status": "active",
  "range_start": "000.000.000.000",
  "range_end": "000.000.000.000",
  "lease_duration": "20000" }
}]

