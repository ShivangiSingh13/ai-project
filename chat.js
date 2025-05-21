const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to find a device by name, type, or room
const findDevice = (query) => {
  const devices = global.inMemoryStorage.devices;
  const lowerQuery = query.toLowerCase();

  // Try exact name match first
  let device = devices.find(d => 
    d.name.toLowerCase() === lowerQuery
  );

  // If not found, try partial matches
  if (!device) {
    device = devices.find(d => 
      d.name.toLowerCase().includes(lowerQuery) ||
      d.type.toLowerCase() === lowerQuery ||
      d.room.toLowerCase().includes(lowerQuery)
    );
  }

  return device;
};

// Helper function to get device icon
const getDeviceIcon = (type) => {
  switch (type) {
    case 'water_heater':
      return '🚿';
    case 'fridge':
      return '🧊';
    case 'wine_cooler':
      return '🍷';
    case 'freezer':
      return '❄️';
    default:
      const icons = {
        light: '💡',
        ac: '❄️',
        fan: '🌀',
        tv: '📺',
        curtain: '🪟',
        speaker: '🔊',
        security: '🔒',
        camera: '📹',
        sensor: '📡',
        appliance: '🔌'
      };
      return icons[type] || '⚡';
  }
};

// Local response system for device control
const getLocalResponse = async (message) => {
  // Handle automation commands
  const listAutomationMatch = message.match(/^(?:show|list|view|get) (?:all )?automations?$/i);
  const createAutomationMatch = message.match(/create automation (.+?) when (.+?) then (.+?)$/i);
  const deleteAutomationMatch = message.match(/(?:delete|remove) automation (.+?)$/i);
  const toggleAutomationMatch = message.match(/(?:enable|disable) automation (.+?)$/i);

  // Handle list automations
  if (listAutomationMatch) {
    try {
      const automations = await axios.get('http://localhost:5002/api/automation');
      if (!automations.data || automations.data.length === 0) {
        return {
          response: "You don't have any automations set up yet. Want to create one? Just ask! 🤓",
          type: 'info'
        };
      }

      let response = "Here are your automation rules! 🤖\n\n";
      automations.data.forEach((rule, index) => {
        response += `${index + 1}. ${rule.name}\n`;
        response += `   • When: ${rule.trigger.type} ${rule.trigger.value}\n`;
        response += `   • Then: ${rule.actions.map(a => `${a.action} ${findDevice(a.deviceId)?.name}`).join(', ')}\n`;
        response += `   • Status: ${rule.isActive ? '🟢 Active' : '🔴 Inactive'}\n\n`;
      });

      return {
        response,
        type: 'info'
      };
    } catch (error) {
      console.error('Error fetching automations:', error);
      return {
        response: "Oops! I had trouble getting your automations. Let's try that again! 🔧",
        type: 'error'
      };
    }
  }

  // Handle create automation
  if (createAutomationMatch) {
    try {
      const [, name, trigger, action] = createAutomationMatch;
      
      // Parse trigger
      let triggerObj = {};
      if (trigger.includes('time')) {
        const timeMatch = trigger.match(/(\d{1,2})(?::|.)(\d{2})(?: ?(?:AM|PM|am|pm))?/);
        if (timeMatch) {
          triggerObj = {
            type: 'time',
            value: `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
          };
        }
      } else if (trigger.includes('temperature')) {
        const tempMatch = trigger.match(/(-?\d+)(?: ?°?[CF])?/);
        if (tempMatch) {
          triggerObj = {
            type: 'temperature',
            value: parseInt(tempMatch[1])
          };
        }
      }

      // Parse action
      const actionMatch = action.match(/(turn on|turn off|toggle) (.+?)$/i);
      if (!actionMatch) {
        return {
          response: "I'm not sure what action you want me to take. Try something like 'turn on living room light'! 😊",
          type: 'error'
        };
      }

      const [, actionType, deviceName] = actionMatch;
      const device = findDevice(deviceName);
      if (!device) {
        return {
          response: `I couldn't find a device called "${deviceName}". Want to see your devices? Just ask! 😊`,
          type: 'error'
        };
      }

      const automation = {
        name,
        trigger: triggerObj,
        actions: [{
          deviceId: device._id,
          action: actionType.replace(' ', '').toLowerCase()
        }],
        isActive: true
      };

      await axios.post('http://localhost:5002/api/automation', automation);

      return {
        response: `Perfect! I've created the automation "${name}"! ✨\nWhen ${trigger}, I'll ${action}. You can count on me! 🤓`,
        type: 'success'
      };
    } catch (error) {
      console.error('Error creating automation:', error);
      return {
        response: "Whoops! Something went wrong creating your automation. Let's try that again! 🔧",
        type: 'error'
      };
    }
  }

  // Handle delete automation
  if (deleteAutomationMatch) {
    try {
      const [, name] = deleteAutomationMatch;
      const automations = await axios.get('/api/automation');
      const automation = automations.data.find(a => a.name.toLowerCase() === name.toLowerCase());

      if (!automation) {
        return {
          response: `I couldn't find an automation called "${name}". Want to see your automations? Just ask! 😊`,
          type: 'error'
        };
      }

      await axios.delete(`http://localhost:5002/api/automation/${automation._id}`);

      return {
        response: `Done! I've deleted the automation "${name}"! 🗑️`,
        type: 'success'
      };
    } catch (error) {
      console.error('Error deleting automation:', error);
      return {
        response: "Oops! I had trouble deleting that automation. Let's try again! 🔧",
        type: 'error'
      };
    }
  }

  // Handle toggle automation
  if (toggleAutomationMatch) {
    try {
      const [, name] = toggleAutomationMatch;
      const automations = await axios.get('/api/automation');
      const automation = automations.data.find(a => a.name.toLowerCase() === name.toLowerCase());

      if (!automation) {
        return {
          response: `I couldn't find an automation called "${name}". Want to see your automations? Just ask! 😊`,
          type: 'error'
        };
      }

      await axios.post(`http://localhost:5002/api/automation/${automation._id}/toggle`);
      const newState = !automation.isActive;

      return {
        response: `Done! The automation "${name}" is now ${newState ? 'enabled 🟢' : 'disabled 🔴'}! ✨`,
        type: 'success'
      };
    } catch (error) {
      console.error('Error toggling automation:', error);
      return {
        response: "Whoops! I had trouble with that. Let's try again! 🔧",
        type: 'error'
      };
    }
  }

  // Handle temperature settings for all devices
  const setTempMatch = message.match(/set (.+?) (?:temperature )?(?:to|at) (-?\d+)(?: ?°?[CF])?/i);
  const setModeMatch = message.match(/set (.+) (?:ac|AC|air conditioner) (?:to|on) (cool|heat|fan|auto|dry)(?:ing)?(?: mode)?/i);
  
  // Handle eco mode
  const ecoModeMatch = message.match(/(?:turn|switch) (.+?) (?:to |on |into )?eco(?: mode)?/i);
  
  // Handle scheduling
  const scheduleMatch = message.match(/schedule (.+?) to (turn on|turn off|start|stop) at (\d{1,2})(?::|.)(\d{2})(?: ?(?:AM|PM|am|pm))?/i);

  // Handle eco mode
  if (ecoModeMatch) {
    try {
      const [, deviceName] = ecoModeMatch;
      const device = findDevice(deviceName);

      if (!device) {
        return {
          response: `I couldn't find a device called "${deviceName}". Want to see your devices? Just ask! 😊`,
          type: 'error'
        };
      }

      // Only temperature-controlled devices support eco mode
      const tempControlDevices = ['ac', 'water_heater', 'fridge', 'wine_cooler', 'freezer'];
      if (!tempControlDevices.includes(device.type)) {
        return {
          response: `Sorry, but "${device.name}" doesn't support eco mode. Only temperature-controlled devices have this feature! 🌱`,
          type: 'error'
        };
      }

      // Set eco mode temperatures
      switch (device.type) {
        case 'ac':
          device.temperature = 24; // Energy-efficient AC temperature
          device.mode = 'auto';
          break;
        case 'water_heater':
          device.temperature = 38; // Energy-efficient water heating
          break;
        case 'fridge':
          device.temperature = 5; // Energy-efficient fridge temperature
          break;
        case 'wine_cooler':
          device.temperature = 14; // Energy-efficient wine storage
          break;
        case 'freezer':
          device.temperature = -18; // Energy-efficient freezer temperature
          break;
      }

      // Emit device update
      if (global.io) {
        global.io.emit('deviceStatus', {
          deviceId: device._id,
          status: device.status,
          temperature: device.temperature,
          mode: device.mode,
          timestamp: new Date()
        });
      }

      const responses = [
        `Eco mode activated for ${device.name}! Saving energy while keeping things just right! 🌱`,
        `${device.name} is now in eco mode. Mother Earth thanks you! 🌎`,
        `Switched ${device.name} to eco-friendly settings. Every little bit helps! 💡`
      ];

      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        type: 'success'
      };

    } catch (error) {
      console.error('Error in eco mode:', error);
      return {
        response: "Oops! Something went wrong while setting eco mode. Let's try that again! 🔧",
        type: 'error'
      };
    }
  }

  // Handle scheduling
  if (scheduleMatch) {
    try {
      const [, deviceName, action, hours, minutes] = scheduleMatch;
      const device = findDevice(deviceName);

      if (!device) {
        return {
          response: `I couldn't find a device called "${deviceName}". Want to see your devices? Just ask! 😊`,
          type: 'error'
        };
      }

      // Convert time to 24-hour format
      let scheduledTime = `${hours.padStart(2, '0')}:${minutes}`;
      
      // Store the schedule (in a real app, this would go to a database)
      if (!device.schedules) device.schedules = [];
      device.schedules.push({
        action: action.toLowerCase(),
        time: scheduledTime,
        enabled: true
      });

      const timeStr = scheduledTime;
      const responses = [
        `Got it! I'll ${action.toLowerCase()} ${device.name} at ${timeStr}. You can count on me! ⏰`,
        `${device.name} scheduled to ${action.toLowerCase()} at ${timeStr}. I'm on it! 📅`,
        `Consider it done! ${device.name} will ${action.toLowerCase()} at ${timeStr}. ✨`
      ];

      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        type: 'success'
      };

    } catch (error) {
      console.error('Error in scheduling:', error);
      return {
        response: "Whoops! I had trouble with that schedule. Could you try again? 🕰️",
        type: 'error'
      };
    }
  }

  if (setTempMatch || setModeMatch) {
    try {
      if (!global.inMemoryStorage || !global.inMemoryStorage.devices) {
        return {
          response: "Oops! I'm having trouble connecting to the smart home system. Give me a moment! 🔧",
          type: 'error'
        };
      }

      let deviceName, setting, settingType;
      if (setTempMatch) {
        [, deviceName, setting] = setTempMatch;
        settingType = 'temperature';
      } else {
        [, deviceName, setting] = setModeMatch;
        settingType = 'mode';
      }

      const device = findDevice(deviceName);

      if (!device) {
        return {
          response: `Hmm, I couldn't find an AC called "${deviceName}". Want to see a list of your ACs? Just ask! 😊`,
          type: 'error'
        };
      }

      // Check if device supports temperature control
      const tempControlDevices = ['ac', 'water_heater', 'fridge', 'wine_cooler', 'freezer'];
      if (!tempControlDevices.includes(device.type) && settingType === 'temperature') {
        return {
          response: `Hmm, I can't set the temperature for "${device.name}". It doesn't have temperature controls! 🤔`,
          type: 'error'
        };
      }

      // Check if device is an AC for mode setting
      if (device.type !== 'ac' && settingType === 'mode') {
        return {
          response: `Oops! "${device.name}" isn't an AC. Only ACs have mode settings! 🤔`,
          type: 'error'
        };
      }

      // Update device settings
      if (settingType === 'temperature') {
        const temp = parseInt(setting);
        if (temp < device.minTemp || temp > device.maxTemp) {
          return {
            response: `Whoa there! ${temp}°C is outside the safe range for ${device.name}. Let's keep it between ${device.minTemp}°C and ${device.maxTemp}°C! 🌡️`,
            type: 'error'
          };
        }
        device.temperature = temp;
      } else {
        device.mode = setting.toLowerCase();
      }

      // Emit device update
      if (global.io) {
        global.io.emit('deviceStatus', {
          deviceId: device._id,
          status: device.status,
          temperature: device.temperature,
          mode: device.mode,
          timestamp: new Date()
        });
      }

      const responses = settingType === 'temperature' ? [
        `Perfect! Set ${device.name} to ${setting}°C. Keeping it comfy! 😎`,
        `${device.name} is now set to ${setting}°C. Just right! 🌡️`,
        `Temperature updated to ${setting}°C. Your comfort is my command! ✨`
      ] : [
        `Switched ${device.name} to ${setting} mode. Like a boss! 😎`,
        `${device.name} is now in ${setting} mode. Feeling good! ✨`,
        `Changed to ${setting} mode. Your wish is my command! 🌬️`
      ];

      return {
        response: responses[Math.floor(Math.random() * responses.length)],
        type: 'success'
      };
    } catch (error) {
      console.error('Error in AC control:', error);
      return {
        response: "Whoops! Something went wrong while adjusting the AC. Let's try that again! 🔧",
        type: 'error'
      };
    }
  }
  if (!message) {
    return {
      response: "Hey there! I didn't quite catch that. Mind saying it again? 😊",
      type: 'error'
    };
  }

  const lowerMessage = message.toLowerCase();
  
  // Play notification sound
  const playSound = (type) => {
    if (global.io) {
      global.io.emit('playSound', { type });
    }
  };

  // Handle device control with personality
  const turnOnMatch = message.match(/turn on (.+)/i);
  const turnOffMatch = message.match(/turn off (.+)/i);
  
  if (turnOnMatch || turnOffMatch) {
    try {
      const deviceName = (turnOnMatch || turnOffMatch)[1].trim();
      const action = turnOnMatch ? 'on' : 'off';

      if (!global.inMemoryStorage || !global.inMemoryStorage.devices) {
        return {
          response: "Oops! I'm having trouble connecting to the smart home system. Give me a moment! 🔧",
          type: 'error'
        };
      }

      const device = findDevice(deviceName);

      if (!device) {
        const responses = [
          `Hmm, I looked everywhere but couldn't find "${deviceName}". Did you mean something else? 🤔`,
          `"${deviceName}"? Never heard of it! Want to see a list of devices I know about? 🔍`,
          `Oops! I don't see "${deviceName}" anywhere. Maybe check the device list? Just ask me to 'list devices'! 😊`
        ];
        return {
          response: responses[Math.floor(Math.random() * responses.length)],
          type: 'error'
        };
      }

      // Update device status
      device.status = turnOnMatch ? true : false;
      
      // Emit device update through Socket.IO
      if (global.io) {
        global.io.emit('deviceStatus', {
          deviceId: device._id,
          status: device.status,
          timestamp: new Date()
        });
      }

      const successResponses = [
        `${device.name} is now ${action}! Anything else you need? 👍`,
        `Done! ${device.name} turned ${action}. Like a boss! 😎`,
        `Bam! ${device.name} is ${action}. What's next on your mind? ✨`,
        `${device.name}: ${action}! Easy peasy! Need anything else? 🌟`
      ];
      return {
        response: successResponses[Math.floor(Math.random() * successResponses.length)],
        type: 'success'
      };
    } catch (error) {
      console.error('Error in device control:', error);
      return {
        response: "Whoops! Something went wrong while controlling the device. Let's try that again! 🔧",
        type: 'error'
      };
    }
  }

  // Handle status command with personality
  if (lowerMessage.includes('status') || lowerMessage.includes('check') || lowerMessage.includes('state') || lowerMessage.includes('how is')) {
    const deviceName = message.toLowerCase()
      .replace(/(status|check|state|how is|the|of)/g, '')
      .trim();

    if (deviceName) {
      // Try to find device by exact name first
      let device = global.inMemoryStorage.devices.find(d => 
        d.name.toLowerCase() === deviceName.toLowerCase()
      );
      
      // If not found, try partial match
      if (!device) {
        device = global.inMemoryStorage.devices.find(d => 
          d.name.toLowerCase().includes(deviceName.toLowerCase()) ||
          d.type.toLowerCase() === deviceName.toLowerCase() ||
          d.room.toLowerCase().includes(deviceName.toLowerCase())
        );
      }

      if (device) {
        let statusResponses;
        if (device.type === 'ac' || device.type === 'water_heater' || device.type === 'fridge' || device.type === 'wine_cooler' || device.type === 'freezer') {
          let tempStatus = '';
          if (device.type === 'ac') {
            tempStatus = device.status ? `running in ${device.mode} mode at ${device.temperature}°C` : 'currently off';
          } else {
            tempStatus = device.status ? `maintaining ${device.temperature}°C` : 'currently off';
          }

          statusResponses = [
            `${device.name} is ${tempStatus} ${device.schedules?.length ? `(Next scheduled action: ${device.schedules[0].action} at ${device.schedules[0].time})` : ''} ${device.type === 'ac' ? '❄️' : '🌡️'}`,
            `Your ${device.name} is ${tempStatus} ${device.schedules?.length ? `(Scheduled: ${device.schedules[0].action} at ${device.schedules[0].time})` : ''} ✨`,
            `${device.name}: ${tempStatus} ${device.schedules?.length ? `(Next up: ${device.schedules[0].action} at ${device.schedules[0].time})` : ''} 📅`
          ];
        } else {
          statusResponses = [
            `Let me check... ${device.name} is ${device.status ? 'rocking and rolling! 🎵' : 'taking a break right now 😴'}`,
            `${device.name}? Oh yeah, it's ${device.status ? 'doing its thing! ✨' : 'chilling in off mode 🌙'}`,
            `Quick peek at ${device.name} - it's ${device.status ? 'up and running! 🚀' : 'powered down 💤'}`,
            `${device.name} is currently ${device.status ? 'on and ready to party! 🎉' : 'having some quiet time 🌟'}`
          ];
        }
        return {
          response: statusResponses[Math.floor(Math.random() * statusResponses.length)],
          type: 'info'
        };
      }

      const notFoundResponses = [
        `Hmm, can't seem to find "${deviceName}". Want me to show you what devices we have? 🔍`,
        `"${deviceName}"? Not ringing any bells! Let me know if you want to see our device list! 🎵`,
        `No "${deviceName}" in my records! Need a quick tour of what we've got? Just ask! 😊`
      ];
      return {
        response: notFoundResponses[Math.floor(Math.random() * notFoundResponses.length)],
        type: 'error'
      };
    }

    const askDeviceResponses = [
      "Which gadget are you curious about? I know all the juicy details! 😉",
      "I'd love to help! Just let me know which device you're wondering about! 🌟",
      "You've got me excited to share some device info! Which one interests you? ✨"
    ];
    return {
      response: askDeviceResponses[Math.floor(Math.random() * askDeviceResponses.length)],
      type: 'info'
    };
  }

  // Handle variations of list devices command with personality
  if (lowerMessage.includes('list') || lowerMessage.includes('show') || lowerMessage.includes('what') || lowerMessage.includes('devices')) {
    const devices = global.inMemoryStorage.devices;
    const devicesByRoom = {};

    // Group devices by room
    devices.forEach(device => {
      const room = device.room || 'Other';
      if (!devicesByRoom[room]) {
        devicesByRoom[room] = [];
      }
      devicesByRoom[room].push(device);
    });

    // Fun room intros
    const roomIntros = {
      'Living Room': [
        "Let's check out your awesome living room setup! 🎶",
        "Your living room is looking pretty techy! ✨"
      ],
      'Bedroom': [
        "Here's what's keeping your bedroom cozy! 🛏",
        "Your bedroom's got some cool gadgets! 🌙"
      ],
      'Kitchen': [
        "Kitchen gadgets, coming right up! 🍳",
        "Your smart kitchen is ready to cook! 🥘"
      ],
      'Bathroom': [
        "Bathroom tech, at your service! 🛀",
        "Making your bathroom extra fancy! ✨"
      ],
      'Study Room': [
        "Your study's looking super smart! 📚",
        "Ready to make studying awesome! 💻"
      ],
      'Security': [
        "Keeping your home safe and sound! 🔒",
        "Your security squad is on duty! 📷"
      ]
    };

    // Fun device status descriptions
    const getStatusDescription = (device) => {
      if (device.status) {
        return [
          "rockin' and rollin'",
          "doing its thing",
          "ready to party",
          "feeling energetic"
        ][Math.floor(Math.random() * 4)];
      } else {
        return [
          "taking a quick nap",
          "chillin'",
          "on standby",
          "having a break"
        ][Math.floor(Math.random() * 4)];
      }
    };

    // Build fun response message
    let response = "Time for the grand tour of your smart home! 🏠\n\n";

    // Add devices by room with personality
    for (const [room, roomDevices] of Object.entries(devicesByRoom)) {
      const roomIntro = roomIntros[room] ? 
        roomIntros[room][Math.floor(Math.random() * roomIntros[room].length)] :
        `Here's what we've got in the ${room}! ✨`;

      response += `${roomIntro}\n`;
      roomDevices.forEach(device => {
        const icon = getDeviceIcon(device.type);
        let statusText;
        if (device.type === 'ac' && device.status) {
          statusText = `${getStatusDescription(device)} (${device.mode} mode, ${device.temperature}°C)`;
        } else {
          statusText = getStatusDescription(device);
        }
        response += `${icon} ${device.name} is ${statusText}\n`;
      });
    }

    response += "\nThat's the tour! Want to control any of these cool gadgets? Just let me know! 😎";

    return {
      response,
      type: 'info'
    };
  }

  // Handle help requests with personality
  if (message.match(/^(help|what can you do|commands|features|guide me|show me|teach me)\b/i)) {
    return {
      response: `Oh boy, let me tell you what I can do! 🎮

First off, I'm basically your home's bestie. I can:
- Give you a tour of all your devices (just say 'list devices' or 'what devices do I have')
- Turn stuff on and off (like 'turn on the bedroom light' or 'turn off kitchen fan')
- Check if things are working ('is the AC on?' or 'check bedroom light')
- Set things to specific settings ('set living room AC to 22' or 'set bedroom light to 50%')

I can also handle automations! Try these:
- 'list automations' to see all your automation rules
- 'create automation morning lights when time is 7:00 then turn on living room light'
- 'create automation cool down when temperature is 25 then turn on living room ac'
- 'enable automation morning lights' or 'disable automation morning lights'
- 'delete automation morning lights' to remove an automation

Just talk to me like you'd talk to a friend - I'm pretty chill! Need anything specific? Just ask! 😊`,
      type: 'info'
    };
  }

  // Handle thanks and acknowledgments
  if (message.match(/^(thanks|thank you|thx|ty|thankyou)(?:[!.])*$/i)) {
    const responses = [
      "You're welcome! Always happy to help! 😊",
      "Anytime! That's what friends are for! ✨",
      "No problem at all! Need anything else? 😉",
      "My pleasure! Always here when you need me! 🤗",
      "Don't mention it! You're the best! 👍"
    ];
    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      type: 'greeting'
    };
  }

  // Handle ok and acknowledgments
  if (message.match(/^(ok|okay|k|sure|alright|got it|fine|yep|yes|yeah)(?:[!.])*$/i)) {
    const responses = [
      "Great! Let me know if you need anything else! 😄",
      "Perfect! I'm here if you need more help! ✨",
      "Awesome! Don't hesitate to ask for anything! 😎",
      "Cool! Always ready to help! 👌",
      "Excellent! Just holler if you need me! 😉"
    ];
    return {
      response: responses[Math.floor(Math.random() * responses.length)],
      type: 'greeting'
    };
  }

  // Handle greetings with personality
  if (message.match(/^(hi|hello|hey|greetings|yo|sup|hola)\b/i)) {
    const greetings = [
      "Hey there! What's up? Ready to control some gadgets? 😊",
      "Yo! Your friendly home assistant here! What can I do for ya? 🌟",
      "Hey buddy! Hope you're having an awesome day! Need any help around the house? 🏠",
      "Well hello there! Ready to make your home do some magic? ✨"
    ];
    return {
      response: greetings[Math.floor(Math.random() * greetings.length)],
      type: 'greeting'
    };
  }

  // Default response with personality
  const defaultResponses = [
    "Whoops! I'm drawing a blank here. 😅 Want to know what I can do? Just say 'help'!",
    "Hey, I'm not quite sure what you mean. But I'm super helpful with home stuff - ask me for 'help' to see my tricks! 🎩",
    "That's a new one! 🤔 Mind trying again? Or say 'help' and I'll show you all the cool things I can do!",
    "I'm scratching my virtual head here! 😄 Let's start over - ask me for 'help' and I'll show you how I can make your home awesome!"
  ];
  return {
    response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
    type: 'error'
  };
};

// Chat endpoint
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({
        response: {
          response: "Hey there! I didn't quite catch that. Mind saying it again? 😊",
          type: 'error'
        }
      });
    }

    const response = await getLocalResponse(message);
    if (!response) {
      return res.status(500).json({
        response: {
          response: "Oops! Something went wrong. Let's try that again! 🔧",
          type: 'error'
        }
      });
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      response: {
        response: "Whoops! I ran into a bit of trouble. Mind trying again? 😊",
        type: 'error'
      }
    });
  }
});

module.exports = router; 