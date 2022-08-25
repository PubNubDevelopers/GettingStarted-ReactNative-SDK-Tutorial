# Tutorial: Get Started Developing a React Native Chat app with PubNub

> Simple app to demonstrate the basic principles of creating a chat app with PubNub.  This React Native app is written using the PubNub React and JavaScript SDKs and will work cross-platform.

PubNub allows you to create chat apps from scratch or add chat to your existing applications. You can focus on creating the best user experience while PubNub takes care of scalability, reliability, security, and global legislative compliance.

Create 1:1 private chat rooms, group chats, or mega chats for large scale events, for a variety of use cases.

> For the sake of simplicity, this application will only focus on a single 'group chat' room

![Screenshot](https://raw.githubusercontent.com/PubNubDevelopers/GettingStarted-ReactNative-SDK-Tutorial/main/media/combined_small.png)

## Demo

Prebuilt versions of this application are not available in the Play Store or App Store.  Please see the installation steps below or ths [Getting Started tutorial](https://www.pubnub.com/tutorials/getting-started-chat-sdk/)

## Features

- [Publish and Subscribe](https://www.pubnub.com/docs/sdks/javascript/api-reference/publish-and-subscribe) for messages with the PubNub JavaScript SDK
- Use [Presence](https://www.pubnub.com/docs/sdks/javascript/api-reference/presence) APIs to determine who is currently chatting
- The [Persistence](https://www.pubnub.com/docs/sdks/javascript/api-reference/storage-and-playback) API will retrieve past messages for users newly joining the chat
- Assign a 'friendly name' to yourself which will be available to others via the PubNub [Object](https://www.pubnub.com/docs/sdks/javascript/api-reference/objects) storage APIs

## Installing / Getting Started

To run this project yourself you will need a PubNub account

### Requirements
- React Native.  (Follow the React Native [Environment setup](https://reactnative.dev/docs/environment-setup))  
- [PubNub Account](https://admin.pubnub.com/) (*Free*)

<a href="https://dashboard.pubnub.com/signup">
	<img alt="PubNub Signup" src="https://i.imgur.com/og5DDjf.png" width=260 height=97/>
</a>

### Get Your PubNub Keys

1. You’ll first need to sign up for a [PubNub account](https://dashboard.pubnub.com/signup/). Once you sign up, you can get your unique PubNub keys from the [PubNub Developer Portal](https://admin.pubnub.com/).

1. Sign in to your [PubNub Dashboard](https://admin.pubnub.com/).

1. Click Apps, then **Create New App**.

1. Give your app a name, and click **Create**.

1. Click your new app to open its settings, then click its keyset.

1. Enable the Presence feature for your keyset.  **Also tick the box for 'Presence Deltas'**.  This lets the app determine who joins and leaves for busy chat channels.

1. Enable the Stream Controller feature for your keyset.

1. Enable the Persistence feature for your keyset

1. Enable the Objects feature for your keyset.  **Also enable 'user metadata events'**, which will allow the app to know when users change their 'friendly name'.

1. Copy the Publish and Subscribe keys and paste them into your app as specified in the next step.

### Building and Running

- Clone the Github repository

```
git clone https://github.com/PubNubDevelopers/GettingStarted-ReactNative-SDK-Tutorial.git
```

- Navigate to the application directory

```
cd GettingStarted-ReactNative-SDK-Tutorial
cd GettingStarted
```

- And install app dependencies

```
npm install
```

- Add your pub/sub keys to the `PubNubKeys.js` file.

-  Run the application in either Android:

```
npm run android
```

- or iOS: 

```
npm run ios
```

## Contributing
Please fork the repository if you'd like to contribute. Pull requests are always welcome. 

## Links

Checkout the following links for more information on developing chat solutions with PubNub:

- Chat Real-Time Developer Path: https://www.pubnub.com/developers/chat-real-time-developer-path/
- Tour of PubNub features: https://www.pubnub.com/tour/introduction/
- Chat use cases with PubNub: https://www.pubnub.com/use-case/in-app-chat/

## Additional Samples

Please also see https://github.com/pubnub/react/tree/master/examples/reactnative which is a basic example of calling PubNub from a React Native app.

Expo developers might also find https://github.com/pubnub/tutorial-app-react-native useful, though it is not recent it does show how to access PubNub through an Expo app.  Alternatively, Expo developers should also be able to take the `App.js` and `styles.js` files from this app and run them within an Expo environment with little or no changes.

