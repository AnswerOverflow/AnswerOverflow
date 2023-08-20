import type { NextPage } from 'next';

const data = [
	{
		name: 'Хижина программиста',
		id: '1003731983970615406',
		icon: 'b1522fcb5d6534026874b81957ee6746',
	},
	{
		name: 'gAmerS',
		id: '1017733690538856529',
		icon: '28a64074bbba91132d57e6f5e271d9b2',
	},
	{
		name: 'ApoloLovro',
		id: '1018024568868315176',
		icon: 'f9a551592499d314c71b3cc2bf581faf',
	},
	{
		name: "shishironline's server",
		id: '1018854788798107778',
		icon: '0f13e2a44ae75cce28419dd05691d4ab',
	},
	{
		name: 'RocketJumpCascade',
		id: '1022673021489651824',
		icon: '9f10c5d4c7482cc01e4e11bb13291001',
	},
	{
		name: 'The battlefield  gang',
		id: '1024404671831494698',
		icon: '8560cf12e8462cbf337ce1961ec9ec08',
	},
	{
		name: '오타쿠 잡탕 찌개',
		id: '1026659224966668298',
		icon: '5f14d048adf712bb5a17f231d68e915d',
	},
	{
		name: 'Reactiflux',
		id: '102860784329052160',
		icon: 'a_4fbc177539c73d884393602c62be8a38',
	},
	{
		name: 'reflex',
		id: '1029853095527727165',
		icon: 'a4941563df30ca51246681cb9929c0f0',
	},
	{
		name: 'Tezos Tools',
		id: '1033545569404190750',
		icon: '42577ebacb561509cfb821a5c341219c',
	},
	{
		name: 'ZenStack',
		id: '1035538056146595961',
		icon: '4d505b4d9bb81ec24234705a2af2dbef',
	},
	{
		name: "ShamsSami's server",
		id: '1040066744808652890',
		icon: '3172e851666c4cacf04d56f330b612f9',
	},
	{
		name: '{GBC/Server}',
		id: '1040774666794573975',
		icon: 'ef8cbbdb1344a39c6dbbf0a34021e1e2',
	},
	{
		name: 'fluid-queue',
		id: '1040941309877301268',
		icon: '23f1760d1e6b925231ceffb95d4e1816',
	},
	{
		name: 'MTHRFCKR',
		id: '1041154039670382644',
		icon: '9db23303854a3cd162ebcaa59b306a15',
	},
	{
		name: 'Drizzle Team',
		id: '1043890932593987624',
		icon: '84fe551f135a3f7656ad3c481f09118c',
	},
	{
		name: 'POP !',
		id: '1047786815941259296',
		icon: '888990030e98a19028a27ce581396f56',
	},
	{
		name: 'AveryGames University',
		id: '1048753854054936626',
		icon: '42193fc71d92c45173cfee5ac32fcff2',
	},
	{
		name: 'ASPL',
		id: '1053681798430859264',
		icon: '6340266e646c83d904b54a90826669db',
	},
	{
		name: 'ateyourtable jr test (BOT TEST)',
		id: '1054160053462126702',
		icon: '120f5c861f97057433a599e50e994cfc',
	},
	{
		name: 'ComCord',
		id: '1055278699571859536',
		icon: '2ab88a5c7bf60d2e3f4756dd60494dbf',
	},
	{
		name: 'Coffee Star ☕',
		id: '1056752583361966112',
		icon: '8c6784fc7e97cfe974b8e10c22727212',
	},
	{
		name: "Imhappy's bots",
		id: '1061062881921212576',
		icon: '7c5d3207f7ac98828fef2004b8dda3fe',
	},
	{
		name: 'Robloxian union allies',
		id: '1063619685272268830',
		icon: '0d2b27849f48fea3fb3ac73c77060f97',
	},
	{
		name: 'Potato',
		id: '1065238829834977300',
		icon: '91f78b231786aad61f1678dbc0d1df4a',
	},
	{
		name: 'ThorVG Community',
		id: '1065834877586509835',
		icon: 'f1fab17fa9b89f03d9b6de754378fcfc',
	},
	{
		name: 'Befron Development',
		id: '1068906323422490704',
		icon: '860d53a7c4539b17e6b5dc575d0ae4c8',
	},
	{
		name: 'TRR.fish',
		id: '1068915969789009970',
		icon: 'dcd21cd519bc8cd994a81bc3a8dcce52',
	},
	{
		name: 'PeachNodes.us | Cheap and Affordable hosting',
		id: '1071910710193430618',
		icon: '330dcf3b84192e982c71da6652c18e03',
	},
	{
		name: 'Partners/Monetization Test Server',
		id: '1072625579247022120',
		icon: 'eb6ac26a9d36a56c19d47675f6ec287a',
	},
	{
		name: 'Tobii Developer Zone',
		id: '1075030407864664145',
		icon: '13b0eda73dfc71a163bb7aa93965b4af',
	},
	{
		name: 'the ugly guys',
		id: '1080436820095021097',
		icon: '200577c8cc307ab0371428fbb9a8b4e3',
	},
	{
		name: 'Answer Overflow Staging',
		id: '1081235771270369380',
		icon: 'ef595722b29aa3a098add2de89aed056',
	},
	{
		name: "SapanaPal's server",
		id: '1081268620904112258',
		icon: '9711b2eb3804df3ea3d96d05e9aeaec8',
	},
	{
		name: "PiyushGarg's server",
		id: '1082554321306136696',
		icon: '43756cdfb5cc9bcbabc3af97372fede4',
	},
	{
		name: 'V-AIS',
		id: '1082978815334170684',
		icon: '5fecd0a432dbdc0bbd105aac35e3c25c',
	},
	{
		name: 'Schoolers',
		id: '1084104219809808484',
		icon: '88f805dfb82c7f024d41d584eb3d10e6',
	},
	{
		name: 'OSINTBuddy',
		id: '1084997846954147901',
		icon: '20ffba82fc3a78d253f3a871ca885a09',
	},
	{
		name: 'Songish',
		id: '1086850996208144484',
		icon: '1cfc6efd8c05075a7e8a95f4f1b934bb',
	},
	{
		name: 'Veeam Community',
		id: '1088642226252435609',
		icon: '952184384651991dd4f148bdce915fed',
	},
	{
		name: 'JoshTriedDiscord',
		id: '1088780748028379146',
		icon: 'ea182e0e702f132fc99514a28f3e2084',
	},
	{
		name: 'Cyber Wizards',
		id: '1089044589966540812',
		icon: '1ac2627f8872b4109188eb43e076775d',
	},
	{
		name: 'wnndedi的服务器',
		id: '1090183895238049876',
		icon: 'aca96a5c7e7a3840cb858fbc5da9882e',
	},
	{
		name: 'LOS AMIGUITOS',
		id: '1096181550963511491',
		icon: '4609a383fa1b211a4b547978b9eb1af9',
	},
	{
		name: "RACHA'S SERVER",
		id: '1100825206781648958',
		icon: '9589544d7438f47377e08a748f1792a0',
	},
	{
		name: 'Betwixt Labs',
		id: '1102669305537110036',
		icon: 'dbc1f66c2ac92c21782df606f049e3c3',
	},
	{
		name: 'Click Community',
		id: '1104980762131963914',
		icon: 'b26bb86b6576577258c37027c2459f36',
	},
	{
		name: '북한산 연구관측단',
		id: '1105009685783908384',
		icon: '648b29692ac943b8b83f3a12086091ea',
	},
	{
		name: 'Animal Farm',
		id: '1107269463646142486',
		icon: '4f72ce6fe40c2b9399b2d2f7b4947fa1',
	},
	{
		name: '投ト民専用サーバー【非公式】',
		id: '1107696075076292753',
		icon: '47636fa063d31e327768b000bfc525eb',
	},
	{
		name: 'Metalama Community',
		id: '1108042639565127740',
		icon: 'c46fd80e50ab4f0d947f14db32485d5a',
	},
	{
		name: 'Zodios',
		id: '1108105356648927313',
		icon: '1bcd0abe2b06e9c10511d05e849cc2a6',
	},
	{
		name: 'みんなの雑談チャット',
		id: '1111775892738428989',
		icon: 'f73a350f996b9814232ea315fac76247',
	},
	{
		name: 'Amine',
		id: '1112373604424876172',
		icon: 'b41718fc2e8be0790cf801358f63b51d',
	},
	{
		name: 'The afterparty',
		id: '1112427176457949305',
		icon: 'bada59f42389c072f41d434fe6275d39',
	},
	{
		name: 'Intersteller Café Corporation',
		id: '1114018667768844311',
		icon: '5d60500864babd6f8087298c3745dd7b',
	},
	{
		name: 'malefashionadvice',
		id: '1116793467654381685',
		icon: 'ed9817aeb50c1c4ce070a5d515283a53',
	},
	{
		name: 'Lanchester EHL-I KEYF zírvєчє dσgru αlcαtrαz',
		id: '1118824621077180556',
		icon: 'c5666ec1d5d5976b12c2f63ab72653ad',
	},
	{
		name: 'Arika-Chan Overflow',
		id: '1120567677338009680',
		icon: 'c42f1968d7c45365841de4283c14075f',
	},
	{
		name: 'Private Server',
		id: '1120737333814247526',
		icon: 'd5715ccdae260b3a52ca1d8730eca59c',
	},
	{
		name: 'LforL別館（読書記録）',
		id: '1122025818433011742',
		icon: 'fe9885b5ce4ec2c13c8f447dde66b6c5',
	},
	{
		name: 'KodHub',
		id: '1123365766700474378',
		icon: 'ac655363eb880ea00b42673a2e8e7b78',
	},
	{
		name: '🏴☠Mafia Crew🏴☠',
		id: '1125604331899588710',
		icon: '49047135301fd9a55be4006d5dc53a22',
	},
	{
		name: 'Turbo Redesign',
		id: '1127656930400284682',
		icon: '7c5a8acc4528f57057fd23d41c66a68e',
	},
	{
		name: 'Function03 Labs',
		id: '1127867360401961012',
		icon: 'fcf867ace490bad5734acc50154b9ecf',
	},
	{
		name: '<> Smokers Lounge',
		id: '1128289298328854631',
		icon: '95c701533746353a08b9f69166a513b1',
	},
	{
		name: 'fedi://topluluk',
		id: '1132010403870818374',
		icon: '83588e3478337cc33de47384b00900b1',
	},
	{
		name: 'EternoGame.com',
		id: '1133129679713349772',
		icon: '1ad3be3b02c47d2fdb75532a02d1c1db',
	},
	{
		name: 'Discord Servers',
		id: '115390342735331332',
		icon: 'b49bac9d74886477207d64f384b0d883',
	},
	{
		name: 'C#',
		id: '143867839282020352',
		icon: 'a_a736265c411725b8d8d5966a079f8244',
	},
	{
		name: 'GermanSimRacing',
		id: '170289352604254217',
		icon: 'a_f974a7f9c7053d3dec7f05eb5ff43445',
	},
	{
		name: 'BattleMetrics',
		id: '202199157224636417',
		icon: '351970a5c1a8161a7659e2fce14c6317',
	},
	{
		name: "Due's Den Of Scum And Villainy",
		id: '213007664005775360',
		icon: '84beca35096212f5b174dbe1b7740ec8',
	},
	{
		name: '🌈 discord.js - Imagine a bot',
		id: '222078108977594368',
		icon: '1ad76bddd2af468c31fdb10cbce63d74',
	},
	{
		name: 'Mudlet',
		id: '283581582550237184',
		icon: '993f3a433011190dd557ed7f635c079a',
	},
	{
		name: 'Dimensional Fun',
		id: '323365823572082690',
		icon: '2d4adac71de20b08404e17ff6387b56f',
	},
	{
		name: 'Res観戦実況Discord',
		id: '327296454702137354',
		icon: '6ec6c529b1038f9ec680fa5a25c50ff3',
	},
	{
		name: 'VeraxArkBotTest',
		id: '388352324122312704',
		icon: '8cec3991a6013588c85228444fec0a10',
	},
	{
		name: 'Kevin Powell - Community',
		id: '436251713830125568',
		icon: 'e15d0f36f109c11bbddd9f7b38431432',
	},
	{
		name: 'Promise Solutions',
		id: '449576301997588490',
		icon: 'd1a2d957ba2a2c0c79ee1b91ed0cb927',
	},
	{
		name: 'MechaKeys',
		id: '462274708499595264',
		icon: '181f38925ce72d826f15b68c7c1257d8',
	},
	{
		name: 'Web Artisan',
		id: '477446113276854307',
		icon: '6c1289e0754abe149f55e88d35c75e96',
	},
	{
		name: 'Cavalry',
		id: '538287787649007618',
		icon: 'b1de2bf191b17fdff1bd6c492dddb4e8',
	},
	{
		name: 'PlayerRealms Skript Community',
		id: '545926404785569793',
		icon: '9c44110144a9d3f3978554ab5e748bc6',
	},
	{
		name: 'Andronix App',
		id: '589695464366931968',
		icon: 'de9e3b26c2cec57310bc292071b0bbc3',
	},
	{
		name: 'Cloudflare Developers',
		id: '595317990191398933',
		icon: 'b0f76e7735292ec106308c4cdcc01159',
	},
	{
		name: "bruv's server",
		id: '606846782973935617',
		icon: '8338ad702bb1cfe02174cda38193ee58',
	},
	{
		name: 'bot testing',
		id: '611555111441006633',
		icon: '1f12e22bd99d0b067d044d96d6903d04',
	},
	{
		name: 'KingdomCraft Staff Server',
		id: '621925220445585410',
		icon: 'a3b3a1b2481efbd959b9e79b8935700a',
	},
	{
		name: 'Champlain Fighting Game Champs',
		id: '637851858714755083',
		icon: '8b23b0f742dc0ff5b3c333b6822c689a',
	},
	{
		name: 'Chatwoot',
		id: '647412545203994635',
		icon: 'e584a9d29a4961aa8d482552201c2236',
	},
	{
		name: 'Chemistry of Dough',
		id: '651569261080346645',
		icon: '0e2f9c9ce04709ddb396314e0420d742',
	},
	{
		name: 'ティッシュ箱',
		id: '662549973778300939',
		icon: 'f063c354ba5a95e689019110db9fdc43',
	},
	{
		name: "RCN's Server",
		id: '673598474910040074',
		icon: 'af7d2dd659798cc476c6b5873f193b42',
	},
	{
		name: 'COIDILOCO',
		id: '674346391061004289',
		icon: '64a6fd9f0d500dd6e18fa837d0182f5e',
	},
	{
		name: '𝙿𝚛𝚘𝚢𝚎𝚌𝚝𝚘 𝙶𝚊𝚕𝚊𝚌𝚝𝚒𝚌𝚊',
		id: '677157093127749634',
		icon: 'd259ec139b568ce1063a07274d82caa3',
	},
	{
		name: 'Deno',
		id: '684898665143206084',
		icon: 'a_a5f8c917998d95e14dd3c48ea9cd0924',
	},
	{
		name: 'Strawberry GraphQL',
		id: '689806334337482765',
		icon: 'a_289c1d2117b567af233e98a3991b80dc',
	},
	{
		name: 'Combat Warriors',
		id: '693237498264027156',
		icon: '073e772bce3f8f04acb45a21a306852e',
	},
	{
		name: 'FIFA Live Editor',
		id: '701008832645824553',
		icon: '71f89bc29ed2d88e0ea0314964eca9e7',
	},
	{
		name: 'Lurkr Support',
		id: '705009450855039039',
		icon: '86e312f2318768cf2db6bea85612130b',
	},
	{
		name: 'r/Flask',
		id: '706671539306627102',
		icon: '3ce9e24cf2ef84e34746fb61850e3adf',
	},
	{
		name: 'SoundSwitch',
		id: '709842059703484457',
		icon: 'b13d213b21f4edab9c585fcb86349f02',
	},
	{
		name: 'WinAdmins TEST',
		id: '713184821651963915',
		icon: 'f0b5fd32bd2c149f0f4b0035ffb82d4b',
	},
	{
		name: 'Railway',
		id: '713503345364697088',
		icon: 'a_f97ccedc2518e72662c539a8d3c6c100',
	},
	{
		name: 'Noti Support Server',
		id: '716792756315357235',
		icon: 'a0372fd6f18e4763dfd68750d4d5b395',
	},
	{
		name: "Darren Lau's server",
		id: '718630036336541736',
		icon: '991916bf6a7139eea73349e975d001e7',
	},
	{
		name: 'SolidJS',
		id: '722131463138705510',
		icon: '04918b78b06f975848b6c99400d349c8',
	},
	{
		name: 'Hallelujah',
		id: '731083399393050674',
		icon: '617f6767ac8b9070432dd18d760fdbfe',
	},
	{
		name: 'League of Extraordinary FoundryVTT Developers',
		id: '732325252788387980',
		icon: 'a_a827d83291060fd0990a016372567033',
	},
	{
		name: 'Hack Upstate',
		id: '733386681192939570',
		icon: 'c117b5641edefb5351e61a35f20c2958',
	},
	{
		name: 'nullbits',
		id: '735314509949829151',
		icon: '30755cb2ede85a1332fe8feb408e5c57',
	},
	{
		name: 'Sapphire - Imagine a framework',
		id: '737141877803057244',
		icon: 'a_60473ac88debfda024c020f50f40d190',
	},
	{
		name: 'TyphonJS',
		id: '737953117999726592',
		icon: 'a_408d439a82975e5bb2d49c7329818bea',
	},
	{
		name: 'Furlough',
		id: '742156704203931681',
		icon: 'a_83562ed593343488c9b1983887a6a14c',
	},
	{
		name: 'GEON',
		id: '743801649377574924',
		icon: 'a_b56bbf79ccfeb2e5f7c87bb0c6844949',
	},
	{
		name: 'Odoo Italia',
		id: '753902328494424064',
		icon: '20ba4cba4009a853e7ce05972e67439f',
	},
	{
		name: '🚗 RSM / Rockstar Mischief',
		id: '757544989507977246',
		icon: 'ed38eb6ad434a64113e36c51a99bc699',
	},
	{
		name: 'stats.fm & Swipefy for Spotify',
		id: '763775648819970068',
		icon: 'a_f8ba26e0270749b389113a2e5cb8bfa0',
	},
	{
		name: "Aditya Thakur's Server",
		id: '768695045259264011',
		icon: '2cc4804d2441a0a836a9934293990544',
	},
	{
		name: 'Vue Storefront',
		id: '770285988244750366',
		icon: 'd235ac8d692870b9b29b1c409ccbc858',
	},
	{
		name: "demonnic's neighborhood",
		id: '770422296636555285',
		icon: '0676dab483cbf30171d6a60afd0a71bf',
	},
	{
		name: 'Open Brush / Icosa Gallery',
		id: '783806589991780412',
		icon: 'bc72b71beee1130c7165250b58f51643',
	},
	{
		name: '놀이터2',
		id: '785699948154847272',
		icon: '0b0b01650dd6124e4337514aa5ef8134',
	},
	{
		name: 'Practice Your Language',
		id: '793202043703001098',
		icon: 'a_9cfffcfc2a980f92ad85f7afc74f3aaf',
	},
	{
		name: 'WebPOV',
		id: '794021395209388032',
		icon: '1f29ba990970f57268d171f85b4fae24',
	},
	{
		name: 'Shuttle',
		id: '803236282088161321',
		icon: 'a_109de419b3426279ad34fe0df381aade',
	},
	{
		name: 'Twill CMS',
		id: '811936425858695198',
		icon: '114983be25163f3e0ef92d1b35711950',
	},
	{
		name: 'Fundamics',
		id: '815595847135395880',
		icon: '9deae2a03c03ef1bbd9ab26ad2660228',
	},
	{
		name: 'SHĪVA',
		id: '817059169101414400',
		icon: '08807940c4a37b6936d4273f7a0cd5bd',
	},
	{
		name: 'Letters for Literature',
		id: '832088351871336539',
		icon: 'fd6a062dbc75c77f918756e8b3ff8bbf',
	},
	{
		name: 'Clyde AI',
		id: '832766499252731905',
		icon: '0408365fca69d1402a62009f5f9d3706',
	},
	{
		name: 'Apache TinkerPop',
		id: '838910279550238720',
		icon: 'a34b6cd8c38c3ff856e95fafb652fdc1',
	},
	{
		name: 'Sonr',
		id: '843061375160156170',
		icon: '2e6ecebffd4bf859b4176a97d71d2b1a',
	},
	{
		name: 'FHumpires',
		id: '844807664545431592',
		icon: 'a_f87c16888988e72380ef47ae88090109',
	},
	{
		name: 'Joe_Whiteのサーバー',
		id: '847576416421150720',
		icon: '3cf45bd3273f998f9186e646c445b86f',
	},
	{
		name: 'KEEBD',
		id: '848055320928583710',
		icon: 'e4d6b3fe0887f1598af87b4aa17e014d',
	},
	{
		name: 'Discord Bots',
		id: '852531635252494346',
		icon: 'a_cab76f0cfbb7490f542b53b11f0bc21c',
	},
	{
		name: 'Appy - Discord application bot',
		id: '854852776550596638',
		icon: 'cad26261780c32e58e15f88fd405d104',
	},
	{
		name: 'Pokémon GO Coordinates',
		id: '864766766932426772',
		icon: 'a_c11aefa860a13575a6db0edb92680e87',
	},
	{
		name: 'tRPC',
		id: '867764511159091230',
		icon: '6af104c7f0f39a12fcd55bd7bd28928f',
	},
	{
		name: 'lablab.ai',
		id: '877056448956346408',
		icon: 'e2ac157a6e11ec860c6bfec4d5cbcd90',
	},
	{
		name: 'defly.io badges',
		id: '877177181413994496',
		icon: 'da7118033e7a5f4ef48e014a0fa75f95',
	},
	{
		name: 'RedSupport',
		id: '881749098179485746',
		icon: '0195c8c49f62d4f97ddcafa15732e92f',
	},
	{
		name: 'Filament',
		id: '883083792112300104',
		icon: '62a747106a4960d2e06d600a010ff731',
	},
	{
		name: 'mmattDonk',
		id: '883929594179256350',
		icon: '3d28c33bf20218e3b31389e69866b30f',
	},
	{
		name: 'BOT SERVER',
		id: '888021392929464320',
		icon: '567d288555a227dcbaee4dc7a7f8c4ba',
	},
	{
		name: 'Carthage',
		id: '888023265996603402',
		icon: '0109e0342589e358112a1b6b3ca86b6a',
	},
	{
		name: 'Kysely',
		id: '890118421587578920',
		icon: '0f18c87f407ea43559705b8ca787e26b',
	},
	{
		name: 'L8TENCY',
		id: '902629391799054426',
		icon: 'a_556b3122c7ba7351cf31d59b49394554',
	},
	{
		name: "user.exe's basement",
		id: '907459973305495592',
		icon: 'b30ec62cf7f78a975213671ff666a8dd',
	},
	{
		name: 'The Swift Den',
		id: '918166237652062228',
		icon: 'aaa051bde3057344eb71b4c4028d3aaf',
	},
	{
		name: '𝐋𝐀 𝐋𝐈𝐆𝐀 𝐓𝐏𝐒 ⚽',
		id: '929108618568151090',
		icon: '46c6a5147018aecc134c18c66ed5934a',
	},
	{
		name: 'Windmill',
		id: '930051556043276338',
		icon: '2d1ab7a478b1bb1e192b07592da993c8',
	},
	{
		name: 'Creatorsgarten',
		id: '931905227848818769',
		icon: '2bf2aaafb9167d7d4e4eff0f991cab85',
	},
	{
		name: 'Paper',
		id: '936354866358546453',
		icon: '991c67aab4327f11d87285dee2fe52a0',
	},
	{
		name: 'MRT',
		id: '937072769831694406',
		icon: '81edbd9ff7a9f1a92d4dba8b7d435f68',
	},
	{
		name: 'Draken Elfo Urbano',
		id: '937336716115726376',
		icon: '29bc51538f488deb17343d584d62da6d',
	},
	{
		name: 'TBD',
		id: '937858703112155166',
		icon: 'e9fb9267f28001ed67d4046242839954',
	},
	{
		name: 'بوتات',
		id: '940735256242319411',
		icon: 'a2748432ad984557b3cbcd61f2751f1d',
	},
	{
		name: 'SkyLegend',
		id: '942839259876958268',
		icon: 'a_60f41a04016d83bab2ca949f13e1b740',
	},
	{
		name: "Ancov11's server",
		id: '943531580553576528',
		icon: '6353c1ff350c49b06548fec2a9ae8ac6',
	},
	{
		name: 'CommunityOne_IO',
		id: '943932308283588628',
		icon: 'f6f97357786827c81f9879c13b67f863',
	},
	{
		name: '🧩 Plasmo Developers',
		id: '946290204443025438',
		icon: 'cbcccb1ee519be4582b6444206418c7a',
	},
	{
		name: 'kexility',
		id: '950067402215915600',
		icon: '2e4ef01366a9cde337e49b7941dcd280',
	},
	{
		name: '===[ HEMOA ]===',
		id: '952320524258791525',
		icon: '01256971ebf9ce35a23e97e408bb1d8d',
	},
	{
		name: 'Answer Overflow',
		id: '952724385238761475',
		icon: '528d997ddc414ff316c4c61014d38f8b',
	},
	{
		name: '学生界隈',
		id: '953562495732293652',
		icon: '309b464e01b1c3031db9bd73a81899e1',
	},
	{
		name: 'New Native',
		id: '959089563945549864',
		icon: 'eb08a96f7ab5fa045bd0c915a6fe0ed2',
	},
	{
		name: 'Big Potatoe',
		id: '959634966520684584',
		icon: '5b7c5f1ac84760c3a87637cc2e72d947',
	},
	{
		name: 'Wolfgang Wagner TYPO3',
		id: '963153773625221200',
		icon: '99b2ae14b303910ebd22a5ab650836df',
	},
	{
		name: "Theo's Typesafe Cult",
		id: '966627436387266600',
		icon: 'd66c9e1586ebc6ce6d43a3d47d6700de',
	},
	{
		name: 'BLUE clan (Epic Renamed)',
		id: '967662976461058068',
		icon: '4e6770c1a1cefac4ed2f0c7bd909c59a',
	},
	{
		name: 'テスト用サーバ',
		id: '972626012779204648',
		icon: '6aa3e07733caf9a9acd4616337cd9fec',
	},
	{
		name: 'Homarr',
		id: '972958686051962910',
		icon: '9c1ec9aa8a1c72e7d5816137f0890eea',
	},
	{
		name: 'Libcord',
		id: '976566685895114823',
		icon: 'b5ade408b0d110bdf5e9512391e80d50',
	},
	{
		name: 'Class Chatting',
		id: '979407933437792346',
		icon: '5da74947e8d046beb407842890fe7ad3',
	},
	{
		name: 'JanusGraph',
		id: '981533699378135051',
		icon: '643d711b3852c838ce102159ecddbd55',
	},
	{
		name: 'Supernatural Confessions',
		id: '987386435847983164',
		icon: 'd641e305aaee8c571332661c177f755a',
	},
	{
		name: 'OccaSoftware',
		id: '999031026204553316',
		icon: '324fe997fd29ed117e74c0183a4cbec3',
	},
];

import AOHead from '@answeroverflow/ui/src/components/primitives/AOHead';
import { Home } from '@answeroverflow/ui/src/components/pages/Home';
// eslint-disable-next-line @typescript-eslint/naming-convention
const HomePage: NextPage = () => {
	return (
		<>
			<AOHead
				path="/"
				title="Answer Overflow - Index Your Discord Server Channels Into Google"
				addPrefix={false}
			/>
			<Home servers={data} />
		</>
	);
};

export default HomePage;
