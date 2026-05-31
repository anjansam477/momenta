// Define a type for the confetti data
type ConfettiData = {
    particleCount?: number;
    angle?: number;
    spread?: number;
    origin?: { x: number | string; y: number | string};
    startVelocity?: number;
    colors?: string[];
    ticks?: number;
    gravity?: number;
    decay?: number;
    scalar?: number;
    shapes?:string[];
    disableForReducedMotion?: boolean;
    drift?:number;
    flat?:boolean;
    zIndex?:number;
};
// Define a type for an animation
type Animation = {
    id: string;
    duration: number;
    interval: number;
    confettiData: ConfettiData[];
};
export const animations:Animation[] = [
    {
        "id":"animation1",
        "duration": 3 * 1000,
        "interval": 1000,
        "confettiData": [
            {
                "spread": 0,
                "gravity": -0.15,
                "startVelocity": 100,
                "particleCount": 100,
                "shapes": ["square","circle"],
                "angle":90,
                "origin":{x:"addLocationX",y:1},
                "decay":0.7
            },
            {
                "spread": 360,
                "ticks": 2000,
                "gravity": 1,
                "decay": 0.95,
                "startVelocity": 20,
                "particleCount": 200,
                "scalar": 1.5,
                "origin":{x:"addLocationX2",y:0.4},
            }
        ]
    },
    {
        "id": "animation2",
        "duration": 2 * 1000,
        "interval": 16,
        "confettiData": [
            {
                "particleCount": 10,
                "angle": 60,
                "spread": 75,
                "origin": { x: 0, y: 1 },
                "startVelocity": 80,
                "colors": ['#FF6347', '#00FFFF', '#FFD700', '#32CD32', '#9370DB', '#FF69B4', '#00FF7F', '#8A2BE2', '#FFFF00', '#40E0D0']
            },
            {
                "particleCount": 10,
                "angle": 120,
                "spread": 75,
                "origin": { x: 1, y: 1 },
                "startVelocity": 80,
                "colors": ['#FF6347', '#00FFFF', '#FFD700', '#32CD32', '#9370DB', '#FF69B4', '#00FF7F', '#8A2BE2', '#FFFF00', '#40E0D0']
            }
        ]
    },
    {
        "id": "animation3",
        "duration": 2 * 1000,
        "interval": 250,
        "confettiData": [
            {
                "spread": 400,
                "origin": { x: "random", y: "random" },
                "startVelocity": 30,
                "ticks": 60,
                "particleCount":300
            },
            {
                "particleCount": 300,
                "spread": 400,
                "origin":{x: "random", y: "random"},
                "startVelocity": 30,
                "ticks": 60
            }
        ]
    }
    ,{
        "id": "animation4",
        "duration": 5 * 1000,
        "interval": 300,
        "confettiData": [
          {
            "spread": 40, 
            "ticks": 200,
            "gravity": -0.5,
            "startVelocity": 40,
            "particleCount": 1,
            "scalar": 15,
            "shapes": ["🎈"],
            "angle": 90,
            "origin": { x: 0.1, y: 1 },
            "flat": true
          },
          {
            "spread": 40, 
            "gravity": -0.5,
            "ticks": 200,
            "startVelocity": 40,
            "particleCount": 1,
            "scalar": 15,
            "shapes": ["🎈"],
            "angle": 90,
            "origin": { x: 0.9, y: 1 },
            "flat": true
          },
          {
            "spread": 70, 
            "gravity": -0.5,
            "startVelocity": 50,
            "particleCount": 100,
            "scalar": 1,
            "ticks": 100,
            "colors": ['FF204E', 'F31559', 'FCAEAE'],
            "angle": 90,
            "origin": { x: 0.9, y: 1 },
          },
          {
            "spread": 70, 
            "gravity": -0.5,
            "startVelocity": 50,
            "particleCount": 100,
            "scalar": 1,
            "ticks": 100,
            "colors": ['FF204E', 'F31559', 'FCAEAE'],
            "angle": 90,
            "origin": { x: 0.1, y: 1 },
          }
        ]
      }
    ,
    {
        "id":"animation5",
        "duration": 1.5 * 1000,
        "interval": 500,
        "confettiData": [
            {
                "spread": 180, 
                "ticks": 200,
                "gravity": 0.9,
                "startVelocity": 40,
                "colors": ["B51B75", "E65C19", "F8D082", "00215E", "C40C0C", "D74B76", "DCFFB7","FFDB5C","E178C5","008DDA","FF8080","E1AEFF","FF2442"],
                "particleCount": 200,
                "shapes": ["square"],
                "angle":270,
                "origin":{x:"increment",y:0.1},
                "disableForReducedMotion": true,
            },
            {
                "spread": 180, 
                "ticks": 200,
                "gravity": 0.9,
                "startVelocity": 40,
                "colors": ["B51B75", "E65C19", "F8D082", "00215E", "C40C0C", "D74B76", "DCFFB7","FFDB5C","E178C5","008DDA","FF8080","E1AEFF","FF2442"],
                "particleCount": 200,
                "shapes": ["square"],
                "angle":270,
                "origin":{x:"decrement",y:0.1},
                "disableForReducedMotion": true,
            }
        ]
    },
    {
        "id": "animation6",
        "duration": 1 * 1000,
        "interval": 16,
        "confettiData": [
            {
                "particleCount": 5,
                "angle": 270,
                "spread": 360,
                "drift":1,
                "colors":["FF6500","FF8A08"],
                "origin": { x: "random", y: 0 },
                "startVelocity": 10,
            },
            {
              "particleCount": 5,
              "angle": 270,
              "spread": 360,
              "drift":-1,
              "colors":["FFF455","FFC700"],
              "origin": { x: "random", y: 0.2 },
              "startVelocity": 10,
            },
            {
              "particleCount": 5,
              "angle": 270,
              "spread": 360,
              "drift":1,
              "colors":["7ABA78","40A578"],
              "origin": { x: "random", y: 0.4 },
              "startVelocity": 10,
            },
            {
              "particleCount": 10,
              "angle": 270,
              "spread": 360,
              "drift":-1,
              "colors":["67C6E3","10439F"],
              "origin": { x: "random", y: 0.6 },
              "startVelocity": 10,
          },
          {
            "particleCount": 10,
            "angle": 270,
            "spread": 360,
            "drift":1,
            "colors":["6C22A6","C65BCF"],
            "origin": { x: "random", y: 0.8 },
            "startVelocity": 10,
          }
        ]
    },
    {
        "id":"animation7",
        "duration": 1 * 1000,
        "interval": 500,
        "confettiData": [
            {
                "spread": 0,
                "gravity": 0,
                "startVelocity": 100,
                "particleCount": 80,
                "colors": ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
                "shapes": ["square","circle"],
                "angle":0,
                "origin":{x:0,y:0.3},
            },
            {
              "spread": 0,
              "gravity": 0,
              "startVelocity": 100,
              "particleCount": 80,
              "shapes": ["square","circle"],
              "colors": ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
              "angle":180,
              "origin":{x:1,y:0.8},
          },
          {
            "spread": 360,
            "ticks": 400,
            "gravity": 1,
            "decay": 0.94,
            "startVelocity": 30,
            "colors": ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
            "particleCount": 80,
            "scalar": 1.5,
            "shapes": ["circle"],
            "origin": {x:0.5 ,y: 0.55 },
        },
        {
            "spread": 360,
            "ticks": 400,
            "gravity": 1,
            "decay": 0.94,
            "startVelocity": 30,
            "colors": ["FFE400", "FFBD00", "E89400", "FFCA6C", "FDFFB8"],
            "particleCount": 15,
            "scalar": 1,
            "shapes": ["star"],
            "origin": {x:0.5 ,y: 0.55 },
        },
        {
            "particleCount": 1,
            "spread": 0,
            "flat":true,
            "origin": {x:0.5 ,y: 0.55 },
            "startVelocity":0.1,
            "shapes":['🏆'],
            "scalar":25,
            "gravity":0.01,
            "drift":0
        }
        ]
    }
    ,
    {
  "id": "animation8",
  "duration": 1.5 * 1000,
  "interval": 400,
  "confettiData": [
    {
      "spread": 180,
      "gravity": -0.3,
      "startVelocity": 60,
      "particleCount": 400,
      "scalar": 1,
      "colors": ['FF204E', 'F31559', 'FCAEAE'],
      "angle": 90,
      "shapes":['circle','square','star'],
      "origin": { x: 0.5, y: 1 }
    },
    {
      "spread": 180, 
      "gravity": -0.3,
      "startVelocity": 70,
      "particleCount": 10,
      "scalar": 5,
      "shapes": ["❤️"],
      "angle": 90,
      "origin": { x: 0.5, y: 1 },
      "flat": true,
    }
  ]
}

    
    ,
      {
          "id": "animation9",
          "duration": 5 * 1000,
          "interval": 16,
          "confettiData": [
            {
              "spread": 180, 
              "ticks": 500,
              "gravity" :1,
              "startVelocity": 10,
              "particleCount": 10,
              "colors": ["#FF0000", "#0000FF", "#00FF00", "#FFFF00","#FFA500","#FF69B4","#00FFFF","#800080","#FF00FF","#FFFFFF"],
              "origin": { x:'random', y: 'random' },
            }
          ]
        }
        ,{
              "id": "animation10",
              "duration": 5 * 1000,
              "interval": 500,
              "confettiData": [
                {
                  "spread": 180, 
                  "ticks": 500,
                  "gravity" :1,
                  "startVelocity": 30,
                  "particleCount": 50,
                  "origin": { x:'random', y: 0 },
                  "shapes":['circle'],
                  "scalar":0.5,
                  "colors" : ["#FFFFFF","#FFFAFA","#F8F8FF","#FFFFF0","#FFFAF0","#F5F5F5", "#FFF5EE", "#FDF5E6","#FAEBD7","#F5F5DC"]
        
                },
                {
                  "spread": 180, 
                  "ticks": 500,
                  "gravity" :1,
                  "startVelocity": 30,
                  "particleCount": 30,
                  "origin": { x:'random', y: 0 },
                  "shapes":['❄️'],
                  "scalar":2
                }
                ,
                {
                  "spread": 180, 
                  "ticks": 500,
                  "gravity" :1,
                  "startVelocity": 30,
                  "particleCount": 50,
                  "origin": { x:'random', y: 0 },
                  "shapes":['circle'],
                  "scalar":1,
                  "colors" : ["#FFFFFF","#FFFAFA","#F8F8FF","#FFFFF0","#FFFAF0","#F5F5F5", "#FFF5EE", "#FDF5E6","#FAEBD7","#F5F5DC"]
        
                },
                {
                  "spread": 180, 
                  "ticks": 500,
                  "gravity" :1,
                  "startVelocity": 30,
                  "particleCount": 30,
                  "origin": { x:'random', y: 0 },
                  "shapes":['❄️'],
                  "scalar":2
                }
              ]
            }
]