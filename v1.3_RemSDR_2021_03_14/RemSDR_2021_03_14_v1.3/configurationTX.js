// ************************************************
// * Fichier de configuration TX / TX Configuration file *
// *************************************************

// SDR parameters
//****************
var SDR_paraTX={Name:"HackRF One",Fmin:1000000,Fmax:6000000000};


//Bande émission amateurs
var BandesTX=new Array();
//BandesTX.push([Fmin,Fmax,"Text",Offset(F_TX- F_RX)]);
BandesTX.push([144000000,146000000,"2 M",0]);
BandesTX.push([2400000000,2400500000,"QO-100 Up",-8089500000]);


// Etiquettes / Labels
//*********************
var LabelTX=new Array();
//Label.push([Frequency,"Text"]);
LabelTX.push([144300000,"Appel USB"]);
LabelTX.push([2400000000,"Lower Beacon"]);
LabelTX.push([2400250000,"Mid Beacon"]);
LabelTX.push([2400360000,"Emergency"]);
LabelTX.push([2400500000,"Upper Beacon"]);


// Zones / Areas in colour
//*************************
var ZoneTX=new Array();
//Zone.push([Fmin,Fmax,"CSS colour");
ZoneTX.push([144150000,144399000,"green"]);
ZoneTX.push([2400150000,2400245000,"green"]);
ZoneTX.push([2400255000,2400350000,"green"]);
ZoneTX.push([2400350000,2400495000,"yellow"]);


