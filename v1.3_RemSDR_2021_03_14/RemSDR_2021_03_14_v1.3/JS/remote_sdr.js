// **************
// * REMOTE SDR *
// *    F1ATB   *
// **************

const Version="Remote SDR V1.3<br><a href='http://f1atb.fr.nf'>F1ATB</a> March 2021";				
// Variables Audio
//****************
var audioRX={Ctx:null, //Contexte
	nbCanaux:1, //Mono
	nbFrames:null,
	Tampon:null, //Zone mémoire
	Duree:2500, // Duree Tampon en ms
	Source:null,
	Started:false,
	deltaIdx:1,  //Rapport sortie audio/entree audio
    tablDonnees:null,
    idxRempli:0,idx_sortie:0,idx_charge:0,entreeFreq:10000,sortieFreq:0,on:false};

const Delta_t_InOut=0.2; // Typical delay in Buffer Audio IN, Audio out: 200ms

var S_metre={level:0,RC_level:0,large:false,bruit:0,teta:0}

// Variables websockets
var websocket_audio;
var websocket_spectre;
var websocket_para;
var web_socket={audio_on:false,spectre_on:false,para_on:false,spectre_in:false};
var Watch_dog={RXpara:0,RXspectre:0,RXaudio:0,TXpara:0};
//Parametres GNU Radio
var SDR_RX={Audio_RX:10489750000,fine:0,centrale_RX:10489750000,FrRX:0,offset:0,Ecart_LNB:0,idx_offset:0,echant:2400000,min:0,max:0,bande:1,idx_bande:2,mode:1,auto_offset:true,bandeRX:0,BandeRXmin:0,BandeRXmax:0,Larg_Fil:2400,VolAudio:1,VolAudinTX:0.2,IP:"",Port:8000};
var Gain_RX={RF:0,IF:20,BB:20};
var audioRX_PB={F1:200,F2:2600}; // Passe bande Audio
var Ecart_LNBs=new Array();  //Correction des offset theoriques du fichier de configuration, sauvegardé en local
var bandes=new Array();
//bande affichée,LP_bande reelle/2,decimLP
bandes.push(["125 kHz",65000,16]);
bandes.push(["250 kHz",130000,8]);
bandes.push(["500 kHz",260000,4]);
bandes.push(["1 MHz",520000,2]);
bandes.push(["2 MHz",1040000,1]);

//Filtres Audio
var biquadFilterHP_RX, biquadFilterLP_RX;;

//Visus
const FFT = 1024; //Taille FFT
var visus={spectre_haut:0.0002,spectre_bas:-1000,spectre_lisse:true,water_haut:0.0002,water_bas:-1000};
var voies_moy=new Array();for (var i=0;i<FFT;i++) { voies_moy[i]=0;}
var waterfall={ligne:0,bloc:false};

//Page
var ecran={large:true,largeur:1,hauteur:1,innerW:1,innerH:1,border:5};
var fenetres={spectreW:0,spectreH:0,waterW:10,waterH:10,para_visus_visible:false};

//Tracking Beacons/Balises
var balise={nb:0,Voies:new Array(),F_Voies:new Array(),Freq:new Array(),Idx:new Array(),Idx_zone:new Array(),voie_recu:false,nb_voies:FFT,K:new Array()};

//Band Plan
var Liste_F=new Array();
var Liste_F_Perso=new Array();

//Zoom Frequency display
var ZoomFreq={id:"",pos:0};




$("#start-audio").click ( function() {
	audioRX.on=!audioRX.on;
	
	
	if (audioRX.Ctx==null && SDR_RX.IP.length>3){
	
		audioRX.Ctx = new AudioContext(); 
		audioRX.nbFrames = audioRX.Ctx.sampleRate * audioRX.Duree/1000;
		audioRX.sortieFreq=audioRX.Ctx.sampleRate;
		audioRX.deltaIdx=audioRX.sortieFreq/audioRX.entreeFreq; //Rapport sortie audio/entree audio
		audioRX.tablDonnees = audioRX.Ctx.createBuffer(audioRX.nbCanaux, audioRX.nbFrames, audioRX.Ctx.sampleRate);
		audioRX.Started=false;
		audioRX.idxRempli=0;
		
		// valeurs aléatoires entre -1.0 et 1.0
		// Récupère un AudioBufferaudioRX.SourceNode.
		// C'est un AudioNode à utiliser quand on veut jouer AudioBuffer
		audioRX.Source = audioRX.Ctx.createBufferSource();

		// assigne le buffer au AudioBufferaudioRX.SourceNode
		audioRX.Source.buffer = audioRX.tablDonnees;
		audioRX.Source.loop=true;

		//Filtre audio passehaut
		biquadFilterHP_RX = audioRX.Ctx.createBiquadFilter();
		biquadFilterHP_RX.type = "highpass";
		biquadFilterHP_RX.frequency.value=audioRX_PB.F1; //Fc:basse

		//Filtre audio passebas
		biquadFilterLP_RX = audioRX.Ctx.createBiquadFilter();
		biquadFilterLP_RX.type = "lowpass";
		biquadFilterLP_RX.frequency.value=audioRX_PB.F2; //Fc:haute
		
		// connecte le AudioBufferaudioRX.SourceNode avec le filtre
		audioRX.Source.connect(biquadFilterHP_RX);
		biquadFilterHP_RX.connect(biquadFilterLP_RX);
		// Connecte le filtre à la destination pour qu'on puisse entendre le son
		biquadFilterLP_RX.connect(audioRX.Ctx.destination);
		Choix_PB_RX();
		
		Lance_Websocket_audio();	 
		
		
		//Analyseur temporel et spectral
		analyser_node_RX = audioRX.Ctx.createAnalyser();
		analyser_node_RX.smoothingTimeConstant = 0.9;
		analyser_node_RX.fftSize = 512;

		  // audioRX.Source connecté à l'analyseur;
		biquadFilterLP_RX.connect( analyser_node_RX );
		
		var buffer_length = analyser_node_RX.frequencyBinCount;

		var array_freq_domain = new Uint8Array(buffer_length);
		

		var script_processor_analysis_node = audioRX.Ctx.createScriptProcessor(512, 1, 1);
		script_processor_analysis_node.connect(audioRX.Ctx.destination); //Buffer sortie ne sera pas utilisé. Mais connection bidon necessaire
		
		script_processor_analysis_node.onaudioprocess = function(data) { //Quand le buffer est plein
								var inputBuffer = data.inputBuffer;
								analyser_node_RX.getByteFrequencyData(array_freq_domain);
								
								if (ecran.large) {
									var array_time_domain = new Uint8Array(buffer_length);
									analyser_node_RX.getByteTimeDomainData(array_time_domain);
									Dessine_Tableau("myAudio_RX_T",array_time_domain,0,0);									
								}
								Dessine_Tableau("myAudio_RX_FFT",array_freq_domain,inputBuffer.sampleRate,4000);
								
					   };
		setInterval("Trace_Audio();",40);
		audioRX.on=true;
	} 
	
	if (audioRX.on) {
		var v="RX Audio<br>On";
		var c="#faa;"
	}else{
		var v="RX Audio<br>Off";
		var c="#aab;"
	}
	$("#start-audio").html(v);
	$("#start-audio").css("background-color",c);
})

//Les Websockets
//***************
function Lance_Websocket_audio(){
	//Initialisation du websocket_audio
	// serveur de test public
	var adresse="ws://"+SDR_RX.IP+":"+(parseInt(SDR_RX.Port)+1).toString()+"/"; //Port serveur web de base +1 pour l'audio
	websocket_audio = new WebSocket(adresse);

	$("#RX_audi_set").css("background-color","LightGreen");

	// code à déclencher quand le connexion est ouverte
	websocket_audio.onopen = function(evt) {
	  $("#RX_audi_con").css("background-color","LightGreen"); //Audio connected
	  web_socket.audio_on=true;
	};

	// code à déclencher si le serveur nous envoie un message
	websocket_audio.onmessage = function(evt) {
		
		
		var canal=0; //Mono
		audioRX.Tampon = audioRX.tablDonnees.getChannelData(canal);
		var SR=audioRX.Ctx.sampleRate;
		var s="";
		var DataAudio_blob = evt.data; //Data Audio reçues en Blob 
		var reader = new FileReader();  // A lire comme un fichier
			reader.addEventListener("loadend", function() {
			   // reader.result contient le contenu du
			   // blob sous la forme d'un tableau typé
			   if(!audioRX.Started){
					audioRX.Started=true;
					// lance la lecture du so
					audioRX.Source.start();
					audioRX.idx_charge=0;
					audioRX.idx_sortie=0;
					
				}
			   var audio=new Int16Array(reader.result);
			  
			  //Audio Index load and read managemenr
			   audioRX.idx_sortie=Math.floor(audioRX.Ctx.currentTime*audioRX.Ctx.sampleRate);
			   var deltaIndex=audioRX.idx_charge-audioRX.idx_sortie-audioRX.Ctx.sampleRate*Delta_t_InOut; //Point equilibre 
			  
			   if(deltaIndex>audioRX.Ctx.sampleRate*0.4) audioRX.idx_charge=audioRX.idx_sortie+audioRX.Ctx.sampleRate*0.19
			   
			   audioRX.deltaIdx=audioRX.deltaIdx-deltaIndex/100000000; //Coef correction
			   if(deltaIndex<-audioRX.Ctx.sampleRate*0.15) audioRX.idx_charge=audioRX.idx_sortie+audioRX.Ctx.sampleRate*0.11;
			   audioRX.entreeFreq=audioRX.Ctx.sampleRate/audioRX.deltaIdx;
			  
			   audioRX.idxRempli=audioRX.idxRempli%audioRX.nbFrames;
			  
			  // Volume RX Audio
    		   var Maxi=0;
			   var Vol=SDR_RX.VolAudio;
			   if(audioTX.Transmit) Vol=SDR_RX.VolAudinTX; //Volume audio quand on transmet
			   if (!audioRX.on) Vol=0; //Audio Off
			   for (var i=0;i<audio.length;i++) {
					var v=audio[i]; //Echantillon 16 bits signés
					Maxi=Math.max(Maxi,v);
					
					v=Vol*v/32768; // l'audio doit être compris entre [-1.0; 1.0]
					v=Math.min(1,Math.max(-1,v));
					var idx_debut_rempli=audioRX.idx_charge;
					var idx_fin_rempli=audioRX.idx_charge+audioRX.deltaIdx;
					
					for (j=idx_debut_rempli;j<idx_fin_rempli;j++){
					    audioRX.idxRempli=Math.floor(j)%audioRX.nbFrames;
						audioRX.Tampon[audioRX.idxRempli] =v; // On rempli le buffer des sons
					}
					audioRX.idx_charge=idx_fin_rempli;
					
				}
				
				
			   
			   
			});
			reader.readAsArrayBuffer(DataAudio_blob);
			Watch_dog.RXaudio=0;
  
	};

	// en cas d'erreur
	websocket_audio.onerror = function(evt){
	  console.log(evt);
	};
  
	 
}



function Lance_Websocket_spectre(){
	//Initialisation du websocket_spectre
	// serveur 
	var adresse="ws://"+SDR_RX.IP+":"+(parseInt(SDR_RX.Port)+2).toString()+"/"; //Port serveur web de base +2 pour le spectre
	websocket_spectre = new WebSocket(adresse);

	$("#RX_spec_set").css("background-color","LightGreen");

	// code à déclencher quand le connexion est ouverte
	websocket_spectre.onopen = function(evt) {
	  $("#RX_spec_con").css("background-color","LightGreen"); //Connected
	  web_socket.spectre_on=true;
	};

	// code à déclencher si le serveur nous envoie spontanément
	// un message
	websocket_spectre.onmessage = function(evt) {
		
		if(!web_socket.spectre_in) { //First messages arrive. GNU RADIO launched
			
			setTimeout("init_para_sdrRX();", 10);
		}
		
		web_socket.spectre_in=true;
		
		var DataSpectre_blob = evt.data; //Data Spectre recues en Blob 
		var reader = new FileReader();  // A lire comme un fichier
			reader.addEventListener("loadend", function() {
			   // reader.result contient le contenu du
			   // blob sous la forme d'un tableau typé
			   
			   var spectre=new Int16Array(reader.result);
			  
			
			  Trace_Spectre(spectre);
			  Trace_Waterfall(spectre);
			  balise.nb_voies=spectre.length;
			  balise.voie_recu=true;
				
			   
			   
			});
			reader.readAsArrayBuffer(DataSpectre_blob);
		
			Watch_dog.RXspectre=0;
		

	  
	};

	// in case of errors
	websocket_spectre.onerror = function(evt){
	  console.log(evt);
	};
  
	
}

function Lance_Websocket_para(){
	//Initialisation du websocket_spectre
	// serveur 
	var adresse="ws://"+SDR_RX.IP+":"+(parseInt(SDR_RX.Port)+3).toString()+"/"; //Port serveur web de base +3 pour les parametres
	websocket_para = new WebSocket(adresse);
	$("#RX_para_set").css("background-color","LightGreen");
	$("#RXonLed").css("background-color","Red");
	// code à déclencher quand le connexion est ouverte
	websocket_para.onopen = function(evt) {
	 $("#RX_para_con").css("background-color","LightGreen");
	  web_socket.para_on=true;
	  $("#RXonLed").css("background-color","Orange");
	  
	};

	// code à déclencher si le serveur nous envoie spontanément
	// un message
	websocket_para.onmessage = function(evt) {
		// le serveur envoi des messages
		
		$("#RXonLed").css("background-color","LightGreen");
	    Watch_dog.RXpara=0;
		
	};

	// en cas d'erreur
	websocket_para.onerror = function(evt){
	  console.log(evt);
	};
  
	
}
	

function init_para_sdrRX(){
	 //On initialise les parametres du  traitement SDR
	  choix_freq_fine();
	  choix_freq_central();
	  choix_bande();
	  choix_mode();
	  choix_GainRX();
}

// CANVAS
//********


// Oscillo

var TraceAudio={X:0,Y:50,Z:50,H:50}
function Trace_Audio(){
	if (ecran.large){
			var Oscillo={H:$("#Oscillo").innerHeight(),W:$("#Oscillo").innerWidth()};
			TraceAudio.H=Oscillo.H-10;
			var canvasOscillo = document.getElementById("myOscillo");
			var ctx = canvasOscillo.getContext("2d");
			ctx.beginPath();
			var Xold=TraceAudio.X;
			TraceAudio.X++;
			if (TraceAudio.X>Oscillo.W){
				TraceAudio.X=0;
				Xold=0;
				ctx.clearRect(0, 0,Oscillo.W,Oscillo.H);
				
			}
			ctx.strokeStyle = "Aqua";
			ctx.moveTo(Xold, TraceAudio.Y);
			audioRX.idxRempli=audioRX.idx_charge%audioRX.nbFrames;
			TraceAudio.Y=TraceAudio.H-audioRX.idxRempli*TraceAudio.H/audioRX.nbFrames;
			ctx.lineTo(TraceAudio.X, TraceAudio.Y); //Buffer en entrée ecriture
			ctx.stroke();
			ctx.beginPath();
			var Old_idx_sortie=audioRX.idx_sortie;
			audioRX.idx_sortie=Math.floor(audioRX.Ctx.currentTime*audioRX.Ctx.sampleRate);
			var idx_lecture=audioRX.idx_sortie%audioRX.nbFrames;
			ctx.strokeStyle = "#FFFF00";
			ctx.moveTo(Xold, TraceAudio.Z);
			TraceAudio.Z=TraceAudio.H-idx_lecture*TraceAudio.H/audioRX.nbFrames;
			ctx.lineTo(TraceAudio.X, TraceAudio.Z);  //Buffer en lecture audio
			ctx.stroke();
	}
	
	//On efface données audio jouées pour eviter les glitchs en cas de retard au chargement
	var K=Math.floor(Old_idx_sortie-audioRX.nbFrames/10);
//	for (var j=Old_idx_sortie;j<audioRX.idx_sortie;j++){
//		audioRX.Tampon[K%audioRX.nbFrames]=0; //Interet à Valider et bug parfois a l'init???????
//		K++;
//	}
	

	
	
	
}


function 	Trace_Spectre(spectre){
	
	var Amp_min=10000000000;
	var Amp_max=-10000000000;
	var X=0
	var dX=ecran.innerW/spectre.length;
	
	var H=fenetres.spectreH;
	var S='<svg height="'+H+'" width="'+ecran.innerW+'" >'; //SVG type of drawing
	S+='<defs><linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">';
    S+='<stop offset="0%" style="stop-color:rgb(255,100,100);stop-opacity:1" />';
	S+='<stop offset="33%" style="stop-color:rgb(200,200,100);stop-opacity:1" />';
	S+='<stop offset="66%" style="stop-color:rgb(100,100,150);stop-opacity:1" />';
    S+='<stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:1" />';
    S+='</linearGradient>';
	S+='</defs>'
	S+='<polygon style="stroke:orange;stroke-width:1" points="0,256 ';
	var Sl=spectre.length;
	var Sl2=spectre.length/2;
	var Sm1=0.15*Sl; //Limits to look for minimum noise, except bad edges and middle
	var Sm2=0.49*Sl;
	var Sm3=0.51*Sl;
	var Sm4=0.85*Sl;
	
	for (var i=0;i<Sl;i++){
		var j=(i+Sl2)%Sl; // Array is shifted by 1/2 in GNU Radio Block FFT Mag Log
		voies_moy[i]=0.1*spectre[j]+0.9*voies_moy[i]; //Mean values - First Order Filter
		if (ecran.large){
			if(visus.spectre_lisse){
				var Y=Math.floor(H*(1-visus.spectre_haut*(voies_moy[i]+visus.spectre_bas)));
			} else {
				var Y=Math.floor(H*(1-visus.spectre_haut*(spectre[j]+visus.spectre_bas)));
			}
			S+=X+','+Y+' ';
			
			X+=dX;
		}
		if ( (i>Sm1 && i<Sm2) || (i>Sm3 && i<Sm4) ) { //dans la bande utile et pas au millieu
			
			Amp_min=Math.min(Amp_min,voies_moy[i]);
			Amp_max=Math.max(Amp_max,voies_moy[i]);
			
		}
		
		
		
	}
	
	
	if (ecran.large) {
		S+=X+',256 0,256" fill="url(#grad1)"  /></svg>';
		$("#mySpectre").html(S);
	}
	
	//Niveau S_metre
	var idx_audio=Math.floor(Sl*(0.5+SDR_RX.fine/(SDR_RX.bande)));
	var K=2*SDR_RX.mode; // 0 pour LSB, 2 pour USB
	S_metre.level=Math.max(voies_moy[(idx_audio-2+K)%Sl],voies_moy[(idx_audio-1+K)%Sl],voies_moy[(idx_audio+K)%Sl]);
	S_metre.bruit=0.99*Amp_min+0.01*S_metre.bruit; //Niveau bruit sur l'horizon	
			
	S_metre.RC_level=Math.max(S_metre.level,0.05*S_metre.level+0.95*S_metre.RC_level); //Montée rapide
	var Sdb=(S_metre.RC_level-S_metre.bruit)/100;
	$("#Smetre_RC").html(Sdb.toFixed(1)); //dB au dessus du bruit
	var teta=S_metre.teta*(-1+Sdb/25);
	$("#SM_fleche").css("transform","rotate("+teta+"rad)");		
			
			
			//Spectre Zoom autour audio +-5kHz
			var W=$("#zSpectre").innerWidth();
			var H=$("#zSpectre").innerHeight();
	if (ecran.large) {
	
			var canvasZS = document.getElementById("zcSpectre");
			var ctx = canvasZS.getContext("2d");
			ctx.lineWidth = 1;
			ctx.clearRect(0, 0,W,H);
			ctx.beginPath();
			var my_gradient = ctx.createLinearGradient(0, 0, 0, H);
			my_gradient.addColorStop(0, "#f66");
			my_gradient.addColorStop(0.33, "#cc6");
			my_gradient.addColorStop(0.66, "#66c");
			my_gradient.addColorStop(1, "#04c");
			ctx.fillStyle = my_gradient;
			var idx_audio_deb=Math.floor(Sl*(0.5+(SDR_RX.fine-5000)/(SDR_RX.bande)));
			var idx_audio_fin=Math.floor(Sl*(0.5+(SDR_RX.fine+5000)/(SDR_RX.bande)));
			ctx.moveTo(-1,H);
			var dX=W*(SDR_RX.bande)/Sl/10000;
			var X=W*(((SDR_RX.bande)*(idx_audio_deb/Sl-0.5)-SDR_RX.fine)/10000+0.5);
			
			for (var idx=idx_audio_deb;idx<=idx_audio_fin;idx++){
				if (idx>=0 && idx <Sl) {
					var Y=H*visus.spectre_haut*(voies_moy[idx]+visus.spectre_bas)+1;
					ctx.fillRect(X, H-Y, dX, H);			
				} 
				X=X+dX;
			}
			ctx.strokeStyle = "#f00"; //Curseur Audio au milieu
			ctx.moveTo(0.5*W,H);
			ctx.lineTo(0.5*W,0);
			ctx.stroke();
	
			//Curseur balises
			ctx.beginPath();
			ctx.strokeStyle = "DarkOrange";
			for (var i=0;i<balise.Idx.length;i++){
						if(balise.Idx[i]>=idx_audio_deb && balise.Idx[i]<=idx_audio_fin) {
							var X=W*((balise.Freq[i]-SDR_RX.Audio_RX)/10000+0.5);
							ctx.moveTo(X,H);
							ctx.lineTo(X,0);
						}
			}
			ctx.stroke();
			
			//Marqueur kHz
			ctx.beginPath();
			ctx.strokeStyle = "White";
			ctx.fillStyle ="White";
			for (var f=-4;f<=4;f=f+2){	
							var X=W*(f/10+0.5);
							ctx.moveTo(X,H);
							ctx.lineTo(X,0.9*H);
							ctx.fillText(f, X, 0.9*H);							
			}
			ctx.fillText("kHz", W*0.93, 0.9*H);	
			ctx.stroke();
	
	}
	
}




function Trace_Waterfall(spectre){
	if (waterfall.ligne==0) waterfall.bloc=!waterfall.bloc;	
	var L=fenetres.waterH-waterfall.ligne-1;
	var p0=-L +"px";
	var p1=-L+fenetres.waterH +"px";
	if (waterfall.bloc){			
		$("#myWaterfall0").css("top",p0);
		$("#myWaterfall1").css("top",p1);
	} else {
		$("#myWaterfall0").css("top",p1);
		$("#myWaterfall1").css("top",p0);
	}
	var canvasWaterfall0 = document.getElementById("myWaterfall0");
	var ctxW0 = canvasWaterfall0.getContext("2d");
	var canvasWaterfall1 = document.getElementById("myWaterfall1");
	var ctxW1 = canvasWaterfall1.getContext("2d");
	
    var Amp=Math.PI*3/2;
	var Sl=spectre.length;
	var Sl2=spectre.length/2;
	if (waterfall.bloc){
			var imgData = ctxW0.getImageData(0, L, FFT, 1);
		} else {
			var imgData = ctxW1.getImageData(0, L, FFT, 1);
		}
	 var k=0;
	for (var i=0;i<spectre.length;i++){
		var j=(i+Sl2)%Sl; //Decalage en frequence FFT d'un 1/2 tableau
		var A=Amp*Math.max(visus.water_haut*(spectre[j]+visus.water_bas),0);
		A=Math.min(A,Amp);
		var r=Math.floor(Math.max(0,-255*Math.sin(A))); //Conversion amplitude to color
		var v=Math.floor(Math.max(0,-255*Math.cos(A)));
		var b=Math.floor(Math.max(0,255*Math.sin(A)));
		
		imgData.data[k] =r;      //Red
		imgData.data[k + 1] = v; //Green
		imgData.data[k + 2] = b; //Blue
		imgData.data[k + 3] = 255;
		k=k+4;
	}
	if (waterfall.bloc){
			ctxW0.putImageData(imgData, 0, L); //On modifie la ligne L
	} else {
			ctxW1.putImageData(imgData, 0, L);
	}
	
	
	
	waterfall.ligne=(waterfall.ligne+1)%fenetres.waterH;
	
}

function Trace_Echelle(){ // Scale drawing
	var canvasEchelle = document.getElementById("myEchelle");
	var ctxE = canvasEchelle.getContext("2d");

	SDR_RX.min=parseInt(SDR_RX.centrale_RX)-SDR_RX.echant/2/bandes[SDR_RX.idx_bande][2];
	SDR_RX.max=parseInt(SDR_RX.centrale_RX)+SDR_RX.echant/2/bandes[SDR_RX.idx_bande][2];
	SDR_RX.bande=SDR_RX.max-SDR_RX.min; // Bande exacte à l'ecran
	
	ctxE.beginPath();
	ctxE.strokeStyle = "#FFFFFF";
	ctxE.fillStyle = "#FFFFFF";
	ctxE.lineWidth = 1;
	ctxE.clearRect(0, 0,ecran.innerW,44);	
	ctxE.font = "10px Arial";
	if (ecran.large) ctxE.font = "12px Arial";

	for (var f=SDR_RX.min;f<=SDR_RX.max;f=f+10000){
		var Fint=10000*Math.floor(f/10000);
		var X=(Fint-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
		ctxE.moveTo(X,0);
		var Y=10;
		var Fintk=Fint/1000;
		var Ytext=25;
		if (ecran.large) Ytext=30;
		if (ecran.large || (SDR_RX.max<SDR_RX.min+1000001)) {
			if (Fint%50000==0) Y=15;
			if (Fint%100000==0) ctxE.fillText(Fintk, X-ctxE.measureText(Fintk).width/2, Ytext);	
		} else {
			if (Fint%100000==0) Y=15;
			if (Fint%500000==0) ctxE.fillText(Fintk, X-ctxE.measureText(Fintk).width/2,Ytext);
        }			
		ctxE.lineTo(X,Y); //traits		
	}
	ctxE.stroke(); // Fin graduations
	
	
	
	//Ecriture bande en couleur
	ctxE.lineWidth = 2;
	for (var i=0;i<Zone.length;i++){
		if ( (Zone[i][0]>=SDR_RX.min && Zone[i][0]<=SDR_RX.max) || (Zone[i][1]>=SDR_RX.min && Zone[i][1]<=SDR_RX.max)){
			ctxE.beginPath();
			ctxE.strokeStyle = Zone[i][2];
			var X0=(Zone[i][0]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
			var X1=(Zone[i][1]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
			ctxE.moveTo(X0,0);			
			ctxE.lineTo(X1,0); //traits
			ctxE.stroke();
		}
	}
	
	//Ecriture Labels des Liste_F
	var S="";
	for (var i=0;i<Liste_F.length;i++){
		if (Liste_F[i][0]>=SDR_RX.min && Liste_F[i][0]<=SDR_RX.max){
			var X=(Liste_F[i][0]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande);
			S+='<div style="left:'+X+'px;" class="coral" onclick="Flabel('+Liste_F[i][0]+',event);">'+Liste_F[i][1]+'</div>';
		}
	}
	$("#echelle_Label").html(S);
	
	//Beacons tracking to compensate clock offset 
	balise.nb=0;
	var S="";
	balise.Freq=new Array;
	balise.Idx=new Array;
	balise.F_Voies=new Array;
	balise.Voies=new Array;
	balise.K=new Array;
	balise.Idx_zone=new Array();
	
	var Fmin=SDR_RX.centrale_RX-SDR_RX.bande/2.4;
	var Fmax=SDR_RX.centrale_RX+SDR_RX.bande/2.4;
	for (var i=0;i<BeaconSync.length;i++){
		 balise.Idx_zone[i]=[0,0];
		if (BeaconSync[i][0]>=Fmin && BeaconSync[i][0]<=Fmax && Math.abs(BeaconSync[i][0]-SDR_RX.centrale_RX)>4000){
			var X=Math.floor((BeaconSync[i][0]-SDR_RX.min)*ecran.innerW/(SDR_RX.bande));
			S+='<div id="beacon'+i+'" style="left:'+X+'px">^</div>';
			balise.Freq[balise.nb]=BeaconSync[i][0];
			balise.Idx[balise.nb]=Math.floor(balise.nb_voies*(0.5+(balise.Freq[balise.nb]-SDR_RX.centrale_RX)/(SDR_RX.bande))); //Voie centrale
			balise.Idx_zone[balise.nb][0]=Math.floor(balise.nb_voies*(0.5+(balise.Freq[balise.nb]-SDR_RX.centrale_RX-4000)/(SDR_RX.bande))); //Voie bas zone recherche grossière
			balise.Idx_zone[balise.nb][1]=Math.floor(balise.nb_voies*(0.5+(balise.Freq[balise.nb]-SDR_RX.centrale_RX+4000)/(SDR_RX.bande))); //Voie haute zone recherche grossière
			balise.F_Voies[balise.nb]=SDR_RX.centrale_RX+(balise.Idx[balise.nb]-511.5)*SDR_RX.bande/balise.nb_voies; //Freq centre voie
			balise.Voies[balise.nb]=[0,0,0]; //Amplitude gauche,centre droite
			
			var Kc=2*balise.nb_voies*(BeaconSync[i][0]-balise.F_Voies[balise.nb])/(SDR_RX.bande); // Coef ponderation voie centrale
			if (BeaconSync[i][0]>balise.F_Voies[balise.nb]){
					balise.K[balise.nb]=[Kc-1,-Kc,1]; //Coef gauche, centre,droite
			} else {
					balise.K[balise.nb]=[-1,-Kc,1+Kc];
			}
			balise.nb++;
		}
	}
	$("#echelle_track").html(S); //Marqueurs des beacons

}



// PARAMETERS TO PASS TO THE RX SDR
//*********************************

function choix_freq_central() {
	SDR_RX.centrale_RX=Math.floor(SDR_RX.centrale_RX);
	SDR_RX.offset=0;
	for (var i=0;i<Offset.length;i++){
			if(SDR_RX.centrale_RX>Offset[i][0] && SDR_RX.centrale_RX<Offset[i][1]) {
				SDR_RX.offset=Offset[i][2];
				
				SDR_RX.Ecart_LNB=Ecart_LNBs[i];
				SDR_RX.idx_offset=i;
			}
	}
	
	SDR_RX.FrRX=SDR_RX.centrale_RX+SDR_RX.offset+SDR_RX.Ecart_LNB;
	SDR_RX.FrRX=Math.floor(SDR_RX.FrRX);
	if (SDR_RX.FrRX>SDR_para.Fmin && SDR_RX.FrRX<SDR_para.Fmax){ //Frequence autorisée
		if (web_socket.para_on && web_socket.spectre_in) {
			websocket_para.send( '{"F_Hack":"' + SDR_RX.FrRX+'"}'); //Frequence du SDR
			$("#RXonLed").css("background-color","grey");
			Affich_freq_champs(SDR_RX.FrRX,"#SFr")
		}
		$("#Frequence_AudioRX").css("background-color","#555");
	} else {
		$("#Frequence_AudioRX").css("background-color","#F00");
	}
	
	Trace_Echelle();
	Affich_freq_Audio_RX();
	Affich_freq_champs(SDR_RX.offset,"#OFS");
	Affich_freq_champs(SDR_RX.Ecart_LNB,"#DOF");
	if (ZoomFreq.id=="DOF") Affich_freq_champs(SDR_RX.Ecart_LNB,"#ZFr"); //Zoom display	
}

function choix_mode(){ //MODE 
	SDR_RX.mode = $("input[name='mode']:checked").val();
	if (web_socket.para_on  && web_socket.spectre_in) websocket_para.send( '{"LSB_USB":"' + SDR_RX.mode+'"}') ;
	sauvegarde_parametres();
	Mode_TX();
}
function choix_bande(){ //Decimation done in GNU Radio
	if (web_socket.para_on  && web_socket.spectre_in) websocket_para.send( '{"decim_LP":"' + bandes[SDR_RX.idx_bande][2]+'"}');
	$("#Bande_RX").html( bandes[SDR_RX.idx_bande][0] );
}
function choix_freq_fine(){  //Frequency for audio channel
	var deltaF=(SDR_RX.bande)/2;
	SDR_RX.fine=Math.max(SDR_RX.fine,-deltaF);
	SDR_RX.fine=Math.min(SDR_RX.fine,deltaF);
	SDR_RX.fine=Math.floor(SDR_RX.fine);
	if (web_socket.para_on  && web_socket.spectre_in) websocket_para.send( '{"F_Fine":"' + SDR_RX.fine+'"}');
	Affich_freq_Audio_RX();
}	
function choix_GainRX(){ //Gains for RX SDR
	if (web_socket.para_on  && web_socket.spectre_in){
		websocket_para.send( '{"Gain_RF":"' + Gain_RX.RF+'"}');
		websocket_para.send( '{"Gain_IF":"' + Gain_RX.IF+'"}');
		websocket_para.send( '{"Gain_BB":"' + Gain_RX.BB+'"}');
	}
	$("#GRFRX").html(Gain_RX.RF);
	$("#GIFRX").html(Gain_RX.IF);
	$("#GBBRX").html(Gain_RX.BB);
	sauvegarde_Gains();
}
function Choix_PB_RX(){ // Bandpass filter for the audio. Cannot be changed in GNU Radio to maintain 90° oscillator phases difference
	if (biquadFilterHP_RX!=null) biquadFilterHP_RX.frequency.value=audioRX_PB.F1;
	if (biquadFilterLP_RX!=null) biquadFilterLP_RX.frequency.value=audioRX_PB.F2;
	$("#LFARX").html(audioRX_PB.F1+" - "+audioRX_PB.F2);
}


//Affichage - Display
//**************
function Affich_freq_Audio_RX(){
	SDR_RX.Audio_RX=Math.floor(SDR_RX.centrale_RX+SDR_RX.fine);
	$("#Fsaisie").html(FkHz(SDR_RX.Audio_RX));
	Affich_freq_champs(SDR_RX.Audio_RX,"#FRX");
	$("#CentFreq").html(FkHz(SDR_RX.centrale_RX)+" kHz");
	if (ZoomFreq.id=="FRX") Affich_freq_champs(SDR_RX.Audio_RX,"#ZFr"); //Zoom display			
	sauvegarde_parametres();	
}
function Affich_freq_champs(F,id){
	var Fr="*              "+F.toString();
	for (var i=1;i<=12;i++){
		$(id+i).html(Fr.substr(-i,1));
	}
}
function Affiche_Mode(){
	if (SDR_RX.mode==0) $("#Lsb").prop("checked",true);	
	if (SDR_RX.mode==1) $("#Usb").prop("checked",true);	
}
function Affiche_Curseur(){
	var p=ecran.innerW*(0.5+SDR_RX.fine/(SDR_RX.bande))-10+ecran.border;
	$("#curseur").css("left",p);
}
function smetreClick(){
	S_metre.large=!S_metre.large;
	if (S_metre.large){
		$("#Smetre").css({"position": "fixed","top":"5%", "height": "30%", "font-size":"100px","border":"inset 4px white"	});
		$("#Smetre_label").css("font-size","18px");
		$("#Smetre_RC").css({"font-size":"100px","width":"250px"});
	}else {
		$("#Smetre").css({"position": "absolute","top":"0%", "height": "100%", "font-size":"20px","border":"0px"});
		$("#Smetre_label").css("font-size","8px");
		$("#Smetre_RC").css({"font-size":"20px","width":"50px"});
	}
	resize_Smetre();
}
function Echelle_dB_Spectre(){
	
	var ctx = document.getElementById("myEchSpectre").getContext("2d");
	ctx.lineWidth = 1;
	ctx.clearRect(0, 0,fenetres.spectreW,fenetres.spectreH);
	ctx.beginPath();
	ctx.strokeStyle = "#ffffff"; 
	ctx.setLineDash([1, 15]);
	for (var level=-32000;level<=32000;level=level+1000){ //Step 10db
		var Y=Math.floor(fenetres.spectreH*(1-visus.spectre_haut*(level+visus.spectre_bas)));
		if (Y>0 && Y<fenetres.spectreH){
			ctx.moveTo(0,Y);
			ctx.lineTo(fenetres.spectreW,Y);
		}
	}
	
	ctx.stroke();
}

function Affiche_ListeF(){
	//Trie liste
	var PasTrie=true;
	while (PasTrie&&Liste_F.length>1 ){
		PasTrie=false;
		for (var i=1;i<Liste_F.length;i++){
			if (Liste_F[i][0]<Liste_F[i-1][0]){
				PasTrie=true;
				var A=Liste_F[i-1];
				Liste_F[i-1]=Liste_F[i];
				Liste_F[i]=A;
			}
		}
	}
	//Affichage liste frequences
	var S="";
	for (var i=0;i<Liste_F.length;i++){
		if (SDR_RX.min<=Liste_F[i][0] && SDR_RX.max>= Liste_F[i][0]){
			if(Liste_F[i][2]) { //Liste perso
				S+='<div><div class="hover DSaisie" onclick="Dsaisie('+Liste_F[i][0]+',\''+Liste_F[i][1]+'\');" >x</div>';
			}else{
				S+="<div><div class='DSaisie' ></div>"
			}
			S+="<span class='hover' onclick='clickF("+i+");'>"+FkHz(Liste_F[i][0])+" "+Liste_F[i][1]+"</span></div>";
		}
	}
	
	$("#ListeF").html(S);
	Trace_Echelle();
}
function FkHz(Fr){
	Fr=Math.floor(Fr/1000).toString().trim();
	var F="";
	for (var p=1;p<=Fr.length;p++){
		F=Fr.charAt(Fr.length-p)+F;
		if (p==3 || p==6) F=" "+F;
	}
	return F;
}
function Ssaisie(){
	var V=$("#Tsaisie").val();
	var pat=/['"<>]/g;
	V=V.replace(pat," ");
	$("#Tsaisie").val("");
	Liste_F.push([SDR_RX.Audio_RX,V,true]);
	Liste_F_Perso.push([SDR_RX.Audio_RX,V]);
	sauvegarde_parametres();
	Affiche_ListeF();
}
function Dsaisie(f,n){ //Delete one record
	for (var i=0;i<Liste_F.length;i++){
			if (Liste_F[i][0]==f&&Liste_F[i][1]==n){
				Liste_F.splice(i,1);
				break;
			}
	}
	for (var i=0;i<Liste_F_Perso.length;i++){
			if (Liste_F_Perso[i][0]==f&&Liste_F_Perso[i][1]==n){
				Liste_F_Perso.splice(i,1);
				break;
			}
	}
	sauvegarde_parametres();
	Affiche_ListeF();
}
//ANCIENS PARAMETRES - OLD parameters stored locally in browser
function recupere_ancien_parametres(){
	
	if (localStorage.getItem("SDR_RX")!=null){ // On a d'anciens parametres en local
		SDR_RX = JSON.parse(localStorage.getItem("SDR_RX"));
		$("#Auto_Offset_On").prop("checked",SDR_RX.auto_offset);
		Ecart_LNBs = JSON.parse(localStorage.getItem("Ecart_LNBs"));
		Liste_F_Perso = JSON.parse(localStorage.getItem("Liste_F_Perso"));
		if (Liste_F_Perso.length>0){
			for (var i=0;i<Liste_F_Perso.length;i++){
				Liste_F.push([Liste_F_Perso[i][0],Liste_F_Perso[i][1],true]);
			}
		}
		Affich_freq_Audio_RX();
		Affiche_Curseur();
		Affiche_Mode(); 
	} 
}
function sauvegarde_parametres(){
	SDR_RX.auto_offset=$("#Auto_Offset_On").prop("checked");
	localStorage.setItem("SDR_RX", JSON.stringify(SDR_RX));
	localStorage.setItem("Ecart_LNBs", JSON.stringify(Ecart_LNBs));
	localStorage.setItem("Liste_F_Perso", JSON.stringify(Liste_F_Perso));
	
}


function recupere_ancien_visus(){
	if (localStorage.getItem("Visus")!=null){
		visus = JSON.parse(localStorage.getItem("Visus"));
		$("#Spectre_average").prop("checked",visus.spectre_lisse);
	}
}
function sauvegarde_visus(){
	visus.spectre_lisse=$("#Spectre_average").prop("checked");
	localStorage.setItem("Visus", JSON.stringify(visus));
}
function recupere_ancien_Gains(){
	if (localStorage.getItem("Gains_RX")!=null){
		Gain_RX = JSON.parse(localStorage.getItem("Gains_RX"));		
	}
}
function sauvegarde_Gains(){
	localStorage.setItem("Gains_RX", JSON.stringify(Gain_RX));
}

//RESIZE
//**********

function window_resize(){
	
	//Recup waterfall
	var canvasWaterfall0 = document.getElementById("myWaterfall0");
	var ctxW0 = canvasWaterfall0.getContext("2d");
	var imgData0 = ctxW0.getImageData(0, 0, fenetres.waterW, fenetres.waterH);
	var P0 = $("#myWaterfall0").position();
	
	var canvasWaterfall1 = document.getElementById("myWaterfall1");
	var ctxW1 = canvasWaterfall1.getContext("2d");
	var imgData1 = ctxW0.getImageData(0, 0, fenetres.waterW, fenetres.waterH);
	var P1 = $("#myWaterfall1").position();
	
	ecran.largeur = window.innerWidth; // parametre qui gere le changement des css'
	ecran.hauteur = window.innerHeight;
	
	
	if (ecran.largeur<=1200 || ecran.hauteur<=800) {
		ecran.large=false;
	} else {	
	    ecran.large=true;
	}
	
	$("#spectre").css("border-width",ecran.border);
	$("#echelle").css("border-width",ecran.border);
	$("#echelle_track").css("left",ecran.border);
	$("#echelle_Label").css("left",ecran.border);
	$("#waterfall").css("border-width",ecran.border);
	ecran.innerW=$("#spectre").innerWidth();
	
	fenetres.spectreW=$("#spectre").innerWidth();
	fenetres.spectreH=Math.floor($("#spectre").innerHeight());
	fenetres.waterW=$("#waterfall").innerWidth();
	fenetres.waterW=FFT;
	fenetres.waterH=Math.floor($("#waterfall").innerHeight());
	
	var Canvas='<canvas id="myEchSpectre"  width="'+fenetres.spectreW+'" height="'+fenetres.spectreH+'" ></canvas>';
	$("#EchSpectre").html(Canvas);
	var Canvas='<canvas id="myWaterfall0" class="myWaterfall" width="'+fenetres.waterW+'" height="'+fenetres.waterH+'" ></canvas>';
	Canvas=Canvas+'<canvas id="myWaterfall1" class="myWaterfall" width="'+fenetres.waterW+'" height="'+fenetres.waterH+'" ></canvas>';
	$("#waterfall_in").html(Canvas);
	
	//Ecriture ancien Waterfall dans nouveau canvas
	canvasWaterfall0 = document.getElementById("myWaterfall0");
	ctxW0 = canvasWaterfall0.getContext("2d");
	ctxW0.putImageData(imgData0, 0, 0);
	$("#myWaterfall0").css("top",P0.top);
		
	canvasWaterfall1 = document.getElementById("myWaterfall1");
	ctxW1 = canvasWaterfall1.getContext("2d");
	ctxW1.putImageData(imgData1, 0, 0);
	$("#myWaterfall1").css("top",P1.top);
	
	
	$("#echelle").html('<canvas id="myEchelle" width="'+ecran.innerW+'" height="43" ></canvas>');
	Trace_Echelle();
	Affiche_Curseur();
	
	$("#Oscillo").html('<canvas id="myOscillo" width="'+$("#Oscillo").innerWidth()+'" height="'+$("#Oscillo").innerHeight()+'" ></canvas>');
	$("#Audio_RX_T").html('<canvas id="myAudio_RX_T" width="'+$("#Audio_RX_T").innerWidth()+'" height="'+$("#Audio_RX_T").innerHeight()+'" ></canvas>');
	$("#Audio_RX_FFT").html('<canvas id="myAudio_RX_FFT" width="'+$("#Audio_RX_FFT").innerWidth()+'" height="'+$("#Audio_RX_FFT").innerHeight()+'" ></canvas>');
	$("#zSpectre").html('<canvas id="zcSpectre" width="'+$("#zSpectre").innerWidth()+'" height="'+$("#zSpectre").innerHeight()+'" ></canvas>');
	
	visus_click_slider("paraSpectre",false);
	visus_click_slider("paraWater",false);
	
    resize_Smetre();
	Echelle_dB_Spectre();
	
	
}
function resize_Smetre(){
		
	
	var Ws=$("#Smetre_fond").innerWidth();
	var Hs=Math.max($("#Smetre_fond").innerHeight(),Ws);
	var Wr=0.8*Ws;
	var Hr=Math.max(0.8*Hs,Hs-$("#Smetre_fond").innerHeight()/4);;
		
	$("#Smetre_fond").html('<canvas id="EchSmetre"  width="'+Ws+'" height="'+Hs+'" ></canvas>');
	var ctx = document.getElementById("EchSmetre").getContext("2d");
	ctx.lineWidth = 5;
	ctx.beginPath();
	S_metre.teta=Math.asin(Wr/(1.8*Hr));
	ctx.strokeStyle = "white";
	ctx.arc(Ws/2, Hs, Hr, -Math.PI/2-S_metre.teta, -Math.PI/2+S_metre.teta/5); //cercle
	ctx.stroke();
	ctx.beginPath();
	ctx.strokeStyle = "orange";
	ctx.arc(Ws/2, Hs, Hr, -Math.PI/2+S_metre.teta/5, -Math.PI/2+S_metre.teta); //cercle
	ctx.stroke();
	ctx.beginPath();
	ctx.lineWidth = 2;
	ctx.font = "8px Arial";
	ctx.strokeStyle = "white";
	
	var Slabel="";
	for (var level=0;level<=50;level=level+10){ //Step 10db
			var t=level*2*S_metre.teta/50-S_metre.teta;
			var X1=Ws/2+Hr*Math	.sin(t);
			var Y1=Hs-Hr*Math.cos(t);
			var X2=Ws/2+(Hr+10)*Math.sin(t);
			var Y2=Hs-(Hr+10)*Math.cos(t);
			ctx.moveTo(X1,Y1);
			ctx.lineTo(X2,Y2);
			Slabel+='<div style="top:'+Y2+'px;left:'+X2+'px;transform:rotate('+t+'rad);">'+level+" dB"+'</div>';
		    
	}
	ctx.stroke();
	
	$("#Smetre_label").html(Slabel);
	
	$("#SM_fleche").css("height",2*Hr+"px");
	$("#SM_fleche").css("top",(Hs-Hr)+"px");
}



function Init_Sliders(){
		$( function() {
			$( "#slider_bande_RX" ).slider({
			  value:SDR_RX.idx_bande,
			  min: 0,
			  max: bandes.length-1,
			  step: 1,
			  slide: function( event, ui ) {
				 SDR_RX.idx_bande=ui.value;
					
				choix_bande();
				Trace_Echelle();
				Affiche_Curseur();
				sauvegarde_parametres();
			  }
			});
		  } );
  
	  $( function() {
		$( "#slider_Frequence_centrale_RX" ).slider({ 
		  value:SDR_RX.centrale_RX,
		  min: SDR_RX.BandeRXmin,
		  max: SDR_RX.BandeRXmax,
		  step: 10000,
		  slide: function( event, ui ) {
			 var old_frequence_centrale_RX=SDR_RX.centrale_RX;
			 SDR_RX.centrale_RX=ui.value;
			 SDR_RX.fine=SDR_RX.fine-SDR_RX.centrale_RX+old_frequence_centrale_RX; //On essaye conserver
			 var deltaF=(SDR_RX.bande)/2.1;
			 SDR_RX.fine=Math.max(SDR_RX.fine,-deltaF);
			 SDR_RX.fine=Math.min(SDR_RX.fine,deltaF);
			 choix_freq_fine();
			 choix_freq_central();
			 Affiche_Curseur();
			 sauvegarde_parametres();
		  }
		});
	  } );
	  
	 $( function() {
		$( "#slider_Spectre_haut" ).slider({
		  min:0.00005 ,
		  max: 0.0007,
		  step: 0.00001,
		  value:  visus.spectre_haut,
		  slide: function( event, ui ) {
			visus.spectre_haut = ui.value ;
			sauvegarde_visus();
			Echelle_dB_Spectre();
		  }
		});
	  } );
	  
	  $( function() {
		$( "#slider_Spectre_bas" ).slider({
		  min:-5000 ,
		  max: 3000,
		  step:10,
		  value:  visus.spectre_bas,
		  slide: function( event, ui ) {
			visus.spectre_bas = ui.value ;
			sauvegarde_visus();
			Echelle_dB_Spectre();
		  }
		});
	  } );
	  
	   $( function() {
		$( "#slider_Water_haut" ).slider({
		  min:0.00005 ,
		  max: 0.0007,
		  step: 0.00001,
		  value:  visus.water_haut,
		  slide: function( event, ui ) {
			visus.water_haut = ui.value ;
			sauvegarde_visus();
		  }
		});
	  } );
	  
	  $( function() {
		$( "#slider_Water_bas" ).slider({
		  min:-5000 ,
		  max: 3000,
		  step:10,
		  value:  visus.water_bas,
		  slide: function( event, ui ) {
			visus.water_bas = ui.value ;
			sauvegarde_visus();
		  }
		});
	  } );
	  
	$( function() {
		$( "#slider_Vol_RX" ).slider({
		  min:-30 ,
		  max: 10,
		  step:1,
		  value: 20* Math.log(SDR_RX.VolAudio)/Math.LN10,
		  slide: function( event, ui ) {
			SDR_RX.VolAudio=Math.pow(10,ui.value/20)  ; //dB
		  }
		});
	  } );
	  
	  $( function() {
		$( "#slider_Vol_RXTX" ).slider({
		  min:-40 ,
		  max: 0,
		  step:0.1,
		  value: 20* Math.log(SDR_RX.VolAudinTX)/Math.LN10 , 
		  slide: function( event, ui ) {
			SDR_RX.VolAudinTX= Math.pow(10,ui.value/20)  ; //dB
		  }
		});
	  } );
	  
	  $( function() {
		$( "#slider_GRF_RX" ).slider({
		  min:0 ,
		  max: 40,
		  step:0.5,
		  value:  Gain_RX.RF,
		  slide: function( event, ui ) {
			Gain_RX.RF= ui.value ;
			choix_GainRX();
		  }
		});
	  } );
	  
	  $( function() {
		$( "#slider_GIF_RX" ).slider({
		  min:0 ,
		  max: 40,
		  step:0.5,
		  value:  Gain_RX.IF,
		  slide: function( event, ui ) {
			Gain_RX.IF= ui.value ;
			choix_GainRX();
		  }
		});
	  } );
	  
	  $( function() {
		$( "#slider_GBB_RX" ).slider({
		  min:0 ,
		  max: 40,
		  step:0.5,
		  value:  Gain_RX.BB,
		  slide: function( event, ui ) {
			Gain_RX.BB= ui.value ;
			choix_GainRX();
		  }
		});
	  } );
	  
	  
	  $( function() {
		$( "#slider_Filtre_RX" ).slider({
		  range: true,
		  min: 100,
		  max: 4000,
		  values: [ 200, 2600 ],
		  slide: function( event, ui ) {
			audioRX_PB.F1=ui.values[ 0 ];
			audioRX_PB.F2=ui.values[ 1 ];
			Choix_PB_RX();
		  }
		});		
	  } );

}

 //Animations fenetres sliders
 //***************************

function visus_click_slider(t,anim){
	
    var x = $("#"+t).position();
	var w=$("#"+t).parent().width();
	var h=$("#"+t).parent().height();
	if (x.left<w/2+10  || !anim) { // Bloc Rentre
	         setTimeout(function(){ fenetres.para_visus_visible=false; }, 200);
			
			if (anim) {
				$("#"+t).animate({
					left: w-20, top:h-20  
				});
			} else {
				$("#"+t).css("top",h-20);$("#"+t).css("left",w-20);
			}
			$("#"+t+"_fleche").css("background-image"," url('/css/Image/fleche_NW.png')");
					
	} else { //Bloc sort
	        fenetres.para_visus_visible=true;
			$("#"+t).animate({
				left: w/2, top:h/3  
			});			
			
			$("#"+t+"_fleche").css("background-image"," url('/css/Image/fleche_SE.png')");
			
	}
}


function Init_Page_RX(){
	$("#f1atb").html(Version);
	//RX Bandes
	var S='<label for="bandSelectRX">Select frequency band:</label>';
	S+='<select name="bandSelectRX" id="bandSelectRX" onchange="newBandRX(this);">';
	for (var i=0;i<BandesRX.length;i++){
		S+='<option value='+i+'>'+BandesRX[i][2]+'</option>';
		Ecart_LNBs[i]=0;
	}
	S+='</select>';
	$("#BandeRX").html(S);
	
	window_resize();
	recupere_ancien_parametres();
	recupere_ancien_visus();
	recupere_ancien_Gains();
	choixBandeRX();
	$("#BandeRX option[value='"+SDR_RX.bandeRX+"']").prop('selected', true);
	
	Init_Sliders();
	
	Init_champs_freq("FRX","#Frequence_AudioRX");
	Init_champs_freq("OFS","#offset");
	Init_champs_freq("DOF","#Ecart_LNB");
	Init_champs_freq("SFr","#SDR_Freq");
	Init_champs_freq("ZFr","#zoom_freq_in");
	
	
	//MouseWheel
	$('#visus').on('mousewheel', function(event){ Mouse_Freq(event)});
	for (var i=1;i<13;i++){
		$('#FRX'+i).on('mousewheel', function(event){ Mouse_Freq_audioRX(event)});
		$('#FRX'+i).on('click', function(event){ OpenZoomFreq(event)});
		$('#DOF'+i).on('mousewheel', function(event){ Mouse_deltaOffset(event)});
		$('#DOF'+i).on('click', function(event){ OpenZoomFreq(event)});
		$('#ZFr'+i).on('mousewheel', function(event){ Mouse_Zoom_Freq(event)});
		$('#ZFr'+i).on('touchmove', function(event){ Touch_Zoom_Freq(event)});
		$('#ZFr'+i).on('touchstart', function(event){ StartTouch_Zoom_Freq(event)});
	}
	Affich_freq_champs(0,"#ZFr");
	
	
	
	//Filtrage audio
	Choix_PB_RX();
	
	// Init Tracking eventuel des beacons pour compenser les offsets
	setInterval("Track_Beacon();",1000);
	
	//Curseur Frequence Audio RX
	dragCurseur();
	
	// Liste Frequences clé
	for (var i=0;i<Label.length;i++){
		Liste_F.push([Label[i][0],Label[i][1],false]);
	}
	Affiche_ListeF();
	if (  SDR_RX.IP.length>3){
		Lance_Websocket_para();
		Lance_Websocket_spectre();
		var adresse="http://"+SDR_RX.IP+":"+SDR_RX.Port+"/cgi-bin/start_sdr_rx_ssb.pl";
		$.ajax({url: adresse, datatype:"script", success: function(result){ //Attention après cela les downloads de fichiers s'arretes
							console.log("Retour RX:",result);;
		  }});
	}
	
	//Init IP
	var MyIP=window.location.hostname;
	if (SDR_RX.IP.length<4 && SDR_TX.IP.length<4){ //Premier demarrage
		SDR_RX.IP=MyIP;
		$("#fen_Par").css("display","block");  //On ouvre la page parametres
	}	
	$("#RX_IP").val(SDR_RX.IP);
	$("#RX_Port").val(SDR_RX.Port);
	
}
function Init_champs_freq(id,idParent){
	//DIV Afficheurs Frequence
	var s="";
	for (var i=0;i<13;i++){
		s="<div id='"+id+i+"'></div>"+s;
	}
	$(idParent).html(s);
	$("#"+id+"0").html("Hz");
}
function choixBandeRX(){	//Suivant freq centrale RX defini les limites
	for (var i=0;i<BandesRX.length;i++){
		
		if (BandesRX[i][0]<=SDR_RX.centrale_RX && BandesRX[i][1]>=SDR_RX.centrale_RX) {
			
			SDR_RX.bandeRX=i;
			SDR_RX.BandeRXmin=BandesRX[i][0];
			SDR_RX.BandeRXmax=BandesRX[i][1];
			
		}
	}
	
}
function newBandRX(t){
	SDR_RX.centrale_RX=Math.floor((BandesRX[t.value][0]+BandesRX[t.value][1])/2);
	SDR_RX.fine=Math.min(BandesRX[t.value][1]-SDR_RX.centrale_RX,SDR_RX.fine);
	SDR_RX.fine=Math.max(BandesRX[t.value][0]-SDR_RX.centrale_RX,SDR_RX.fine);
	choixBandeRX();
	$("#slider_Frequence_centrale_RX").slider("option", "min",  SDR_RX.BandeRXmin);
	$("#slider_Frequence_centrale_RX").slider("option", "max", SDR_RX.BandeRXmax);
	$("#slider_Frequence_centrale_RX").slider("option", "value",  SDR_RX.centrale_RX);
	
	choix_freq_central();
	choix_freq_fine();
	Affiche_Curseur();
	Affiche_ListeF();
}

// CURSEUR FREQUENCE
function Mouse_Freq(ev){
	SDR_RX.fine = SDR_RX.fine+10*ev.deltaY;
	choix_freq_fine();
	Affiche_Curseur();
	
}
function Mouse_Freq_audioRX(ev){ //modif des digits
	var p=parseInt(ev.target.id.substr(3))-1;
	var deltaF=ev.deltaY*Math.pow(10,p);
	Recal_fine_centrale(deltaF);
}
function Recal_fine_centrale(deltaF){
	var newFreq=SDR_RX.Audio_RX+deltaF;
	if (newFreq>SDR_RX.min+10000 && newFreq<SDR_RX.max-10000){ // On bouge la frequence fine
		SDR_RX.fine=SDR_RX.fine+deltaF;
		choix_freq_fine();
	} else { //gros saut en frequence
		SDR_RX.centrale_RX=SDR_RX.centrale_RX+deltaF;
		choix_freq_central();
	}
	Affiche_Curseur();
	
}
function OpenZoomFreq(ev){
	ZoomFreq.id=ev.target.id.substr(0, 3);
	var T=ZoomFreq.id;
	var F=0;
	if (ZoomFreq.id=="FRX") {
		F=SDR_RX.Audio_RX;
		var T="RX Audio";
	}
	
	if (ZoomFreq.id=="DOF") {
		F=SDR_RX.Ecart_LNB;
		var T="Manual Correction";
	}
	
	if (ZoomFreq.id=="FRT") { //Frequency TX
		F=SDR_TX.Freq;
		var T="TX Frequency";
	}
	
	if (ZoomFreq.id=="OFT") { //Offset TX
		F=SDR_TX.Offset;
		var T="TX Manual Correct.";
	}
	
	Affich_freq_champs(F,"#ZFr");
	$("#zoom_freq_title").html(T);
	$('#zoom_freq').css('display','block');
}
function Mouse_Zoom_Freq(ev){ //modif des digits du zoom
	var F=0;
	if (ZoomFreq.id=="FRX") {
			Mouse_Freq_audioRX(ev);
			F=SDR_RX.Audio_RX;
	}
	if (ZoomFreq.id=="DOF") {
			Mouse_deltaOffset(ev);
			F=SDR_RX.Ecart_LNB;
	}
	if (ZoomFreq.id=="FRT") {
			Mouse_Freq_TX(ev);
			F=SDR_TX.Freq;
	}
	if (ZoomFreq.id=="OFT") {
			Mouse_deltaOffsetTX(ev);
			F=SDR_TX.Offset;
	}
	Affich_freq_champs(F,"#ZFr");
}
function StartTouch_Zoom_Freq(ev){
	
	if (ev.touches.length == 1) {
			ev.preventDefault();
			ZoomFreq.pos = ev.touches[0].clientY;
	}
}
function Touch_Zoom_Freq(ev){ //modif des digits
	var p=parseInt(ev.target.id.substr(3))-1;
	var F=0;
	if (ev.touches.length == 1) {
			ev.preventDefault();
			var deltaFreq = Math.pow(10,p)*(ZoomFreq.pos-ev.touches[0].clientY)/50;	
			if (ZoomFreq.id=="FRX") {
				Recal_fine_centrale(deltaFreq);
				F=SDR_RX.Audio_RX;
			}
			if (ZoomFreq.id=="DOF") {
				Recal_deltaOffset(deltaFreq);
				F=SDR_RX.Ecart_LNB;
			}
			if (ZoomFreq.id=="FRT") {
				Recal_FTX(deltaFreq);
				F=SDR_TX.Freq;
			}
			if (ZoomFreq.id=="OFT") {
				Recal_OfTX(deltaFreq);
				F=SDR_TX.Offset;
			}
			Affich_freq_champs(F,"#ZFr");
	}
}
function Mouse_deltaOffset(ev){ //modif des digits
	var p=parseInt(ev.target.id.substr(3))-1;
	var deltaF=ev.deltaY*Math.pow(10,p);
	Recal_deltaOffset(deltaF);
}
function Recal_deltaOffset(deltaF){
	SDR_RX.Ecart_LNB=Math.floor(SDR_RX.Ecart_LNB+deltaF);
	Ecart_LNBs[SDR_RX.idx_offset]=SDR_RX.Ecart_LNB;
	choix_freq_central();
	Affiche_Curseur();
}
function dragCurseur() {
	var idCurseur =document.getElementById("curseur");
	var pos1 = 0,  pos3 = 0, posDiv=0;
 
	idCurseur.onmousedown = dragMouseDown;
	idCurseur.addEventListener('touchmove', onTouchMove, false);
	idCurseur.addEventListener('touchstart', onTouchStart, false);


	function dragMouseDown(e) {	 
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		idCurseur.style.left=(pos3-10)+"px";
		posDiv=parseFloat(idCurseur.style.left);
		document.onmouseup = closeDragElement;
		document.onmousemove = elementDrag;
		
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		pos1 = pos3 - e.clientX;   
		pos3 = e.clientX;
		posDiv=posDiv-pos1;	
		idCurseur.style.left=posDiv+"px";
		var new_pos=posDiv+10-ecran.border;
		SDR_RX.fine=Math.floor(SDR_RX.min+(SDR_RX.bande)*new_pos/ecran.innerW -SDR_RX.centrale_RX);
		choix_freq_fine();
	}

	function closeDragElement() { 
	   document.onmouseup = null;
	   document.onmousemove = null;	
	}
	function onTouchStart(ev) {
		
		if (ev.touches.length == 1) {
			ev.preventDefault();
			pos3 = ev.touches[0].clientX;
			posDiv=parseFloat(idCurseur.style.left);
			
		}
	}
	function onTouchMove(ev) {
		
		if (ev.touches.length == 1) {
			ev.preventDefault();
			pos1 = pos3  - ev.touches[0].clientX;  
			pos3 = ev.touches[0].clientX;
			posDiv=posDiv-pos1;
			idCurseur.style.left=posDiv+"px";			
			
			var new_pos=posDiv+10-ecran.border;
			SDR_RX.fine=Math.floor(SDR_RX.min+(SDR_RX.bande)*new_pos/ecran.innerW -SDR_RX.centrale_RX);
			choix_freq_fine();
				
		}
	}
	
}



function clickFreq(e){
	 e = e || window.event;
	if (!fenetres.para_visus_visible){
			e.preventDefault();
			// calculate the new cursor position:
			var new_pos =  e.clientX-ecran.border;
			SDR_RX.fine=Math.floor(SDR_RX.min+(SDR_RX.bande)*new_pos/ecran.innerW -SDR_RX.centrale_RX);
			choix_freq_fine();
			Affiche_Curseur();
	}
}
function clearRX(){ //Set frequenci to the closest kHz
	SDR_RX.Audio_RX=10000*Math.floor(SDR_RX.Audio_RX/10000+0.5);
	SDR_RX.fine=SDR_RX.Audio_RX-SDR_RX.centrale_RX;
	choix_freq_fine();
	Affiche_Curseur();
}
function clickF(i){ //Liste frequences en mémoire
	SDR_RX.Audio_RX=Liste_F[i][0];
	SDR_RX.fine=SDR_RX.Audio_RX-SDR_RX.centrale_RX;
	choix_freq_fine();
	Affiche_Curseur();
}
function Flabel(f,e){
	e = e || window.event;
	e.stopPropagation();
	SDR_RX.Audio_RX=f;
	SDR_RX.fine=SDR_RX.Audio_RX-SDR_RX.centrale_RX;
	choix_freq_fine();
	Affiche_Curseur();
}
function ValideIP(){
	var V=$("#RX_IP").val().trim();
	if (V.length<4) V="";
	SDR_RX.IP=V;
	$("#RX_IP").val(V)
	var V=$("#TX_IP").val().trim();
	if (V.length<4) V="";
	SDR_TX.IP=V;
	$("#TX_IP").val(V);
	var V=$("#RX_Port").val().trim();
	if (parseInt(V)<1025 || parseInt(V)>65535) V="";
	SDR_RX.Port=V;
	$("#RX_Port").val(V);
	$("#RX_ports").html("");
	V=parseInt(V);
	if (V>1024) $("#RX_ports").html("used: "+V+","+(V+1)+","+(V+2)+","+(V+3));
	
	var V=$("#TX_Port").val().trim();
	if (parseInt(V)<1025 || parseInt(V)>65535) V="";
	$("#TX_Port").val(V);
	SDR_TX.Port=V;
	$("#TX_ports").html("");
	V=parseInt(V);
	if (V>1024) $("#TX_ports").html("used: "+V+","+(V+4)+","+(V+5));

	sauvegarde_parametres();
	sauvegarde_parametresTX();
}

function Track_Beacon() {
	var coul="grey";
	SDR_RX.auto_offset=$("#Auto_Offset_On").prop("checked");
	if (web_socket.para_on && web_socket.spectre_in){
		if (balise.voie_recu && SDR_RX.auto_offset) { //On s'assure d'avoir reçu des données recemment
			var Ecart=0;
			var Nb_valide=0;
			coul="Orange";
			for (var i=0;i<balise.nb;i++){
				for (var v=-1;v<=1;v++){			
					balise.Voies[i][v+1]=0.1*voies_moy[balise.Idx[i]+v]+0.9*balise.Voies[i][v+1]; //Integration longue niveau voie
				}			
				//Recherche grossière de la voie la plus forte
				var Max=-1000000;var K=0;
				for (var j=balise.Idx_zone[i][0];j<=balise.Idx_zone[i][1];j++){
					if (voies_moy[j]>Max){
						Max=voies_moy[j];
						K=j;
					}
					
				}
				
				if ( Math.abs(balise.Idx[i]-K)<=1) { //voie centrale, gauche ou droite
					if ( balise.Voies[i][1]>100){ //Niveau voie centrale suffisant A AMELIORER DEFINIR BON SEUIL/BRUIT+++++++++++++++++++++
						var Vg=Math.pow(10,balise.Voies[i][0]/10000); //On quitte les log
						var Vc=Math.pow(10,balise.Voies[i][1]/10000);
						var Vd=Math.pow(10,balise.Voies[i][2]/10000);
						Ecart+=(Vg*balise.K[i][0]+Vc*balise.K[i][1]+Vd*balise.K[i][2])/Vc; //Ecart normalisé
						Nb_valide++;
						coul="Lime";
					}
				} else {
					if (Max>100){ //Niveau voie suffisant A AMELIORER!!!!!!!!!!!!!!!!!!!!!!!!
						if (K<balise.Idx[i]) {  
							Ecart+=-0.1; // On force un saut de 100Hz
						} else {
							Ecart+=0.1;
						}
						Nb_valide++;
						coul="LightGreen";
					}
				}
			}
			if (Nb_valide>0){ // On a des ecarts par rapport aux balises
				var dF=Math.floor(1000*Ecart/Nb_valide); //Coef de decalage en frequence 
				if (dF!=0){
					Ecart_LNBs[SDR_RX.idx_offset]+=dF;
					choix_freq_central();
		
				} 
				$("#F_df").html(dF+" Hz");
			}
			
			
			
		} else {
			choix_freq_central(); //On rafraichi
			$("#F_df").html("");
		}
	}
	balise.voie_recu=false;
	$("#F_Offset_locked").css("background-color",coul);
}



function Dessine_Tableau(canvas_ID,tableau,SR,Fmax) { // dessine une onde (tableau de bytes) dans le canvas
	var canvas = document.getElementById(canvas_ID);
	var ctx = canvas.getContext("2d");
	var Largeur = canvas.width;
	var Hauteur = canvas.height;
	ctx.clearRect(0, 0, Largeur, Hauteur);
     	
    ctx.fillStyle = '#000030'; 
    ctx.fillRect(0, 0, Largeur, Hauteur);
    ctx.font = "9px Arial";
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
	ctx.fillStyle = 'white';
    ctx.beginPath();
    var longT=tableau.length;
	if (Fmax>0) { // C'est une FFT. On limite l'axe des F
		longT=Math.floor(longT*2*Fmax/SR);
		var FMX=Fmax/1000;
		for(var f = 0; f < FMX; f++) {
		   var x = Largeur*f/FMX;
		  ctx.moveTo(x, Hauteur);
		  ctx.lineTo(x, 0.95*Hauteur);
		  ctx.fillText(f, x, 0.95*Hauteur);
		}
		ctx.fillText("kHz", Largeur*0.95, 0.95*Hauteur);
	}
  var sliceWidth = Largeur / longT;
  var x = 0;
  var Vtop=0;
  var Itop=0;
      for(var i = 0; i < longT; i++) {

        var v = tableau[i] / 128.0;
        var y = Hauteur-1-v * Hauteur/2;
		if (v>Vtop){ //Recherche du max
			Vtop=v;
			Itop=i;
		}
        if(i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }
	   ctx.stroke();
	  ctx.beginPath();
	  ctx.font = "12px Arial";
	  if (Fmax>0) { // C'est une FFT. On affiche le max
		var I=Itop;
		if (Itop>1 && Itop<longT-2) { //Recherche X par interpollation
			I=Itop+(tableau[Itop+1]-tableau[Itop-1])/(1+tableau[Itop])*0.5;
		}
	  
		var Ftop=Math.floor(I*Fmax/longT);
			  ctx.fillText(Ftop+"Hz", 0.05*Largeur, 0.15*Hauteur);

		}
	  
      ctx.stroke();
    };
//Surveillance echange data
setInterval("WatchDog();",1000);
function WatchDog(){
	if(SDR_RX.IP.length>3) {
		Watch_dog.RXpara++;
		Watch_dog.RXspectre++;
		if (audioRX.on) Watch_dog.RXaudio++;
		if (Math.max(Watch_dog.RXpara,Watch_dog.RXspectre,Watch_dog.RXaudio)>5) $("#RXonLed").css("background-color","Red"); //Alerte messages n'arrivent pas
	}
	if(SDR_TX.IP.length>3) {
		Watch_dog.TXpara++;
		if (Watch_dog.TXpara>6) $("#TXonLed").css("background-color","Red"); //Alerte messages n'arrivent pas
	}
}


//Page FULL SCREEN

var FS_On =false;
function switch_page(){
	FS_On=!FS_On;
	var elem = document.documentElement;
	if (FS_On) {
			/* View in fullscreen */		
			  if (elem.requestFullscreen) {
				elem.requestFullscreen();
			  } else if (elem.mozRequestFullScreen) { /* Firefox */
				elem.mozRequestFullScreen();
			  } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
				elem.webkitRequestFullscreen();
			  } else if (elem.msRequestFullscreen) { /* IE/Edge */
				elem.msRequestFullscreen();
			  }
	} else {	

/* Close fullscreen */
			  if (document.exitFullscreen) {
				document.exitFullscreen();
			  } else if (document.mozCancelFullScreen) { /* Firefox */
				document.mozCancelFullScreen();
			  } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
				document.webkitExitFullscreen();
			  } else if (document.msExitFullscreen) { /* IE/Edge */
				document.msExitFullscreen();
			  }
	}
}