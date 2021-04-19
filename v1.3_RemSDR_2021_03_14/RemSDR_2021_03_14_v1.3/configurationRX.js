// ************************************************
// * Fichier de configuration RX / RX Configuration file *
// *************************************************

// SDR parameters
//****************
var SDR_para={Name:"HackRF One or RTL-SDR",Fmin:1000000,Fmax:6000000000};

//Bandes  amateurs
var BandesRX=new Array();
//BandesRX.push([Fmin,Fmax,"Text"]);
BandesRX.push([3500000,3800000,"80 M"]);
BandesRX.push([5351500,5366500,"60 M"]);
BandesRX.push([7000000,7200000,"40 M"]);
BandesRX.push([10100000,10150000,"30 M"]);
BandesRX.push([14000000,14350000,"20 M"]);
BandesRX.push([18068000,18168000,"17 M"]);
BandesRX.push([21000000,21450000,"15 M"]);
BandesRX.push([24890000,24990000,"12 M"]);
BandesRX.push([28000000,29700000,"10 M"]);
BandesRX.push([50000000,52000000,"6 M"]);
BandesRX.push([144000000,146000000,"2 M"]);
BandesRX.push([2400000000,2400500000,"QO-100 Up"]);
BandesRX.push([10489500000,10490000000,"QO-100 Down"]);

// Offset / Décallage en fréquence (ex:Antenne parabolique)
//*********************************
var Offset=new Array();
//Valeurs définies en Hz
//Retirer les // ci-dessous pour définir des Offsets
//Offset.push([Fmin,Fmax,Offset]);
Offset.push([10000000000,11000000000,-9750000000]);


// Etiquettes / Labels
//*********************
var Label=new Array();
//Label.push([Frequency,"Text");
Label.push([3760000,"Emergency"]);
Label.push([7110000,"Emergency"]);
Label.push([14300000,"Emergency"]);
Label.push([18160000,"Emergency"]);
Label.push([21360000,"Emergency"]);
Label.push([144300000,"SSB Call"]);
Label.push([10489500000,"Lower Beacon"]);
Label.push([10489750000,"Mid Beacon"]);
Label.push([10490000000,"Upper Beacon"]);
Label.push([10489790000,"QSO Fr"]);
Label.push([10489860000,"Emergency"]);


// Zones / Areas in colour
//*************************
var Zone=new Array();
//Zone.push([Fmin,Fmax,"CSS colour");
Zone.push([10489500000,10489505000,"#f00"]);
Zone.push([10489505000,10489540000,"#0f0"]);
Zone.push([10489540000,10489650000,"#88c"]);
Zone.push([10489650000,10489745000,"#8ff"]);
Zone.push([10489745000,10489755000,"#f00"]);
Zone.push([10489755000,10489850000,"#8ff"]);
Zone.push([10489995000,10490000000,"#f00"]);


// Balises / Beacons Clocks Synchronisation
//***********************************
var BeaconSync=new Array();
//BeaconSync.push([Frequency,"Info Text");
BeaconSync.push([10489500000,"Lower Beacon Q0100"]);
BeaconSync.push([10489750000,"Mid Beacon Q0100"]);
BeaconSync.push([10490000000,"Upper Beacon Q0100"]);