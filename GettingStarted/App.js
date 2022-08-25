import React, {useState, useEffect} from 'react'
import type {Node} from 'react'
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Button,
  useColorScheme,
  View,
  AppState,
  Image,
} from 'react-native'
import styles from './styles.js'
import * as PubNubKeys from './PubNubKeys.js'
import DeviceInfo from 'react-native-device-info'

import PubNub from 'pubnub'
import {PubNubProvider} from 'pubnub-react'

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen'

//  The deviceId is required to initiate the PubNub object, this will be updated once
//  the application launches with an ID based on the device's hardware (considering the
//  platforms privacy rules).
var deviceId = 'ChangeMe'

//  This application hardcodes a single channel name for simplicity.  Typically you would use separate channels for each
//  type of conversation, e.g. each 1:1 chat would have its own channel, named appropriately.
const groupChatChannel = 'group_chat'

//  Create PubNub configuration and instantiate the PubNub object, used to communicate with PubNub
const pubnub = new PubNub({
  subscribeKey: PubNubKeys.PUBNUB_SUBSCRIBE_KEY,
  publishKey: PubNubKeys.PUBNUB_PUBLISH_KEY,
  uuid: 'ChangeMe',
})

const App: () => Node = () => {
  //  Note: Application does not look different in dark mode
  //const isDarkMode = useColorScheme() === 'dark'

  //  Application state is persisted through hooks
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [friendlyNames, setFriendlyNames] = useState({})
  const [onlineMembers, setOnlineMembers] = useState({online: []})
  const [appTitle, setAppTitle] = useState('Group Chat')
  //  State for friendly name edit field
  const [myFriendlyName, setMyFriendlyName] = useState('')
  const [friendlyNameEditable, setFriendlyNameEditable] = useState(false)
  const [friendlyNameButtonText, setFriendlyNameButtonText] = useState('Edit')

  //  This application is designed to unsubscribe from the channel when it goes to the background and re-subscribe
  //  when it comes to the foreground.  This is a fairly common design pattern.  In production, you would probably
  //  also use a native push message to alert the user whenever there are missed messages.  For more information
  //  see https://www.pubnub.com/tutorials/push-notifications/
  const handleChange = newState => {
    if (newState === 'active') {
      //  application is in the foreground
      if (deviceId === 'ChangeMe') {
        //  Not subscribing because device Id has not yet been set
      } else {
        //  Subscribe to the pre-defined channel representing this chat group.  This will allow us to receive messages
        //  and presence events for the channel (what other users are in the room)
        pubnub.subscribe({channels: [groupChatChannel], withPresence: true})
      }
    } else if (newState == 'background') {
      //  application is in the background
      //  This getting started application is set up to unsubscribe from all channels when the app goes into the background.
      //  This is good to show the principles of presence but you don't need to do this in a production app if it does not fit your use case.
      pubnub.unsubscribe({channels: [groupChatChannel]})
    }
  }

  useEffect(() => {
    async function getDeviceId () {
      //  Create a device-specific DeviceId to represent this device and user, so PubNub knows who is connecting.
      //  More info: https://support.pubnub.com/hc/en-us/articles/360051496532-How-do-I-set-the-UUID-
      //  All Android IDs are user-resettable but are still appropriate for use here.
      deviceId = await DeviceInfo.getUniqueId()
      pubnub.setUUID(deviceId)

      //  In order to receive object UUID events (in the addListener) it is required to set our
      //  membership using the Object API.
      pubnub.objects.setMemberships({
        channels: [groupChatChannel],
      })

      //  There is logic in the presence listener to determine who is in the channel but
      //  I am definitely here
      addMember(deviceId)

      //  Subscribe to the pre-defined channel representing this chat group.  This will allow us to receive messages
      //  and presence events for the channel (what other users are in the room)
      pubnub.subscribe({channels: [groupChatChannel], withPresence: true})
    }

    //  You need to specify a Publish and Subscribe key when configuring PubNub on the device.
    if (
      PubNubKeys.PUBNUB_PUBLISH_KEY.startsWith('REPLACE') ||
      PubNubKeys.PUBNUB_SUBSCRIBE_KEY.startsWith('REPLACE')
    ) {
      setAppTitle('MISSING PUBNUB KEYS')
    }

    getDeviceId()

    const subscription = AppState.addEventListener('change', handleChange)
    if (pubnub) {
      const listener = {
        //  A message is received from PubNub.  This is the entry point for all messages on all
        //  channels or channel groups, though this application only uses a single channel.
        message: receivedMsg => {
          setMessages(msgs => [
            ...msgs,
            {
              id: receivedMsg.timetoken,
              author: receivedMsg.publisher,
              content: receivedMsg.message,
              timetoken: receivedMsg.timetoken,
            },
          ])
        },
        //  Be notified that a 'presence' event has occurred.  I.e. somebody has left or joined
        //  the channel.  This is similar to the earlier hereNow call but this API will only be
        //  invoked when presence information changes, meaning you do NOT have to call hereNow
        //  periodically.
        presence: presenceMsg => {
          if (presenceMsg.action == 'join') {
            addMember(presenceMsg.uuid)
          } else if (presenceMsg.action == 'leave') {
            removeMember(presenceMsg.uuid)
          } else if (presenceMsg.action == 'interval') {
            //  'join' and 'leave' will work up to the ANNOUNCE_MAX setting (defaults to 20 users)
            //  Over ANNOUNCE_MAX, an 'interval' message is sent.  More info: https://www.pubnub.com/docs/presence/presence-events#interval-mode
            //  The below logic requires that 'Presence Deltas' be defined for the keyset, you can do this from the admin dashboard
            if (presenceMsg['join'] != undefined) {
              for (var i = 0; i < presenceMsg['join'].length; i++) {
                addMember(presenceMsg['join'][i])
              }
            }
            if (presenceMsg['leave'] != undefined) {
              for (var i = 0; i < presenceMsg['leave'].length; i++) {
                removeMember(presenceMsg['leave'][i])
              }
            }
          }
        },
        //  Whenever Object meta data is changed, an Object event is received.
        //  See: https://www.pubnub.com/docs/chat/sdks/users/setup
        //  Use this to be notified when other users change their friendly names
        objects: objMsg => {
          if (objMsg.message.type == 'uuid') {
            replaceMemberName(objMsg.message.data.id, objMsg.message.data.name)
          }
        },
      }

      //  Applications receive various types of information from PubNub through a 'listener'
      pubnub.addListener(listener)

      //  When the application is first loaded, it is common to load any recent chat messages so the user
      //  can get caught up with conversations they missed.  Every application will handle this differently
      //  but here we just load the 8 most recent messages
      pubnub
        .fetchMessages({
          channels: [groupChatChannel],
          includeUUID: true,
          count: 8,
        })
        .then(historicalMessages => {
          var historicalMessagesArray =
            historicalMessages['channels'][groupChatChannel]
          for (var i = 0; i < historicalMessagesArray.length; i++) {
            var message = historicalMessagesArray[i]
            lookupMemberName(message.uuid)
            setMessages(msgs => [
              ...msgs,
              {
                id: message.timetoken,
                author: message.uuid,
                content: message.message,
                timetoken: message.timetoken,
              },
            ])
          }
        })

      //  PubNub has an API to determine who is in the room.  Use this call sparingly since you are only ever likely to
      //  need to know EVERYONE in the room when the UI is first created.
      pubnub
        .hereNow({
          channels: [groupChatChannel],
          includeUUIDs: true,
        })
        .then(devicesHereNow => {
          try {
            var occupants =
              devicesHereNow['channels'][groupChatChannel]['occupants']

            occupants.forEach(function (member, index) {
              addMember(occupants[index].uuid)
            })
          } catch (error) {
            //  Error executing hereNow
          }
        })

      return () => {
        subscription.remove()
      }
    }
  }, [pubnub])

  const convertTimetoken = timetoken => {
    var date = new Date(Math.trunc(timetoken / 10000, 16))
    var timedisplay = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return timedisplay
  }

  //  A DeviceID is present in the chat (as determined by either hereNow or the presence event)
  //  Update our chat member list
  const addMember = deviceId => {
    if (!onlineMembers['online'].includes(deviceId)) {
      var newMembers = onlineMembers
      newMembers['online'].push(deviceId)

      //  Force an update.  Recreate object since state comparisons are shallow
      setOnlineMembers({...newMembers})
    }
    lookupMemberName(deviceId)
  }

  //  A Device ID is absent from the chat (as determined by either hereNow or the presence event)
  //  Update our chat member list
  const removeMember = deviceId => {
    if (onlineMembers['online'].includes(deviceId)) {
      var newMembers = onlineMembers
      const index = newMembers['online'].indexOf(deviceId)
      if (index > -1) newMembers['online'].splice(index, 1)

      //  Force an update.  Recreate object since state comparisons are shallow
      setOnlineMembers({...newMembers})
    }
  }

  //  Update the DeviceId --> friendly name mappings.
  //  Used for when names CHANGE
  const replaceMemberName = (deviceId, newName) => {
    var newFriendlyNames = friendlyNames
    newFriendlyNames[deviceId] = newName
    setFriendlyNames({...newFriendlyNames})

    //  Force an update of the messages view with the new name
    setMessages(msgs => [...msgs])
  }

  //  The 'master record' for each device's friendly name is stored in PubNub Object storage.
  //  This avoids the application defining its own server storage or trying to keep track of all
  //  friendly names on every device.  Since PubNub Objects understand the concept of a user name
  //  (along with other common fields like email and profileUrl), it makes the process straight forward
  const lookupMemberName = async deviceIdentifier => {
    if (friendlyNames[deviceIdentifier] === undefined) {
      try {
        const result = await pubnub.objects.getUUIDMetadata({
          uuid: deviceIdentifier,
        })
        var newFriendlyNames = friendlyNames
        newFriendlyNames[deviceIdentifier] = result.data.name
        setFriendlyNames({...newFriendlyNames})

        if (deviceIdentifier == deviceId) {
          setMyFriendlyName(result.data.name)
        }

        //  Force an update of the messages view with the new name
        setMessages(msgs => [...msgs])
      } catch (error) {
        //  This happens if the UUID is not known on the server which is
        //  a common occurance so just swallow this
      }
    }
  }

  /**
   * Button handler for the Edit / Save friendly name button
   * Persist the friendly name in PubNub object storage (this is the master record)
   */
  const handleSaveFriendlyName = async () => {
    if (friendlyNameEditable) {
      //  Save the current value
      try {
        const result = await pubnub.objects.setUUIDMetadata({
          data: {
            name: myFriendlyName,
          },
        })
      } catch (status) {
        console.log('Save friendly name status: ' + status)
      }
      setFriendlyNameButtonText('Edit')
      setFriendlyNameEditable(false)
    } else {
      setFriendlyNameButtonText('Save')
      setFriendlyNameEditable(true)
    }
  }

  /**
   * Button handler for the Send button
   */
  const handleSend = () => {
    if (input === '') {
      return
    }

    // Clear the input field.
    setInput('')

    // Publish our message to the channel `chat`
    pubnub.publish({channel: groupChatChannel, message: input})
  }

  return (
    <SafeAreaView style={styles.outerContainer}>
      <KeyboardAvoidingView
        style={styles.innerContainer}
        behavior='height'
        keyboardVerticalOffset={Platform.select({
          ios: 78,
          android: 20,
        })}
      >
        {/*
          Header to hold the current friendly name of the device along with other devices in the group chat
          The below logic will launch the settings activity when the option is selected
          */}
        <View style={styles.topContainer}>
          <Text style={styles.headingTopContainer}>{appTitle}</Text>
          <View style={styles.membersOnlineContainer}>
            <Text style={[styles.member, styles.highlight]}>
              Members Online:
            </Text>
            {onlineMembers['online'].map(member => (
              <Text style={styles.member} key={member}>
                {friendlyNames[member] !== undefined
                  ? friendlyNames[member]
                  : member}
              </Text>
            ))}
          </View>

          <Text style={[styles.textTopContainer, styles.highlight]}>
            Friendly Name:
          </Text>
          <View style={styles.friendlyNameEdit}>
            <TextInput
              style={styles.textInputFriendlyName}
              value={myFriendlyName}
              defaultValue={myFriendlyName}
              editable={friendlyNameEditable}
              onChangeText={setMyFriendlyName}
              onSubmitEditing={handleSaveFriendlyName}
              returnKeyType='send'
              enablesReturnKeyAutomatically={true}
              placeholder='friendly name'
            />
            <View style={styles.saveFriendlyName}>
              <Button
                title={friendlyNameButtonText}
                buttonStyle={styles.saveFriendlyName}
                color='#33687B'
                onPress={handleSaveFriendlyName}
              />
            </View>
          </View>
        </View>

        {
          //  Only minor styling for the message view, a production app would look far superior to this!
        }
        <ScrollView
          ref={ref => {
            this.scrollView = ref
          }}
          onContentSizeChange={() => {
            try {
              this.scrollView.scrollToEnd({animated: true})
            } catch (error) {}
          }}
        >
          <View style={styles.messageScrollContainer}>
            {messages.map(message => (
              <View
                key={message.id}
                style={
                  message.author == deviceId
                    ? styles.messageContainerMe
                    : styles.messageContainerThem
                }
              >
                <View
                  style={
                    message.author == deviceId
                      ? styles.avatarNone
                      : styles.avatarThem
                  }
                >
                  <Image
                    style={styles.logo}
                    source={{
                      uri:
                        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAA5CAYAAAB0+HhyAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TpUWqInaQ4pChOlkQFXHUKhShQqgVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi6OSk6CIl/i8ptIj14Lgf7+497t4BQr3MNKtrHNB020wl4mImuyoGXhHEIPowgIjMLGNOkpLoOL7u4ePrXYxndT735+hVcxYDfCLxLDNMm3iDeHrTNjjvE4dZUVaJz4nHTLog8SPXFY/fOBdcFnhm2Eyn5onDxGKhjZU2ZkVTI54ijqqaTvlCxmOV8xZnrVxlzXvyF4Zy+soy12kOI4FFLEGCCAVVlFCGjRitOikWUrQf7+CPuH6JXAq5SmDkWEAFGmTXD/4Hv7u18pMTXlIoDnS/OM7HCBDYBRo1x/k+dpzGCeB/Bq70lr9SB2Y+Sa+1tOgR0L8NXFy3NGUPuNwBhp4M2ZRdyU9TyOeB9zP6piwweAv0rHm9Nfdx+gCkqavkDXBwCIwWKHu9w7uD7b39e6bZ3w9BPXKTmZenygAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB+YIEw4TFA++WWoAAALfSURBVGje7ZpNaxZXFICfMwbUxkZUqBJU0C78gApG20VFkdBWkErMQlFBF+K6tsv2X4h7V7qutqsWwQ/MQhFbN35sYtWgpVCjTTUq5n26cIQIDeSdzJ13JuTZDgPzzDn3nnPPTFAiagBbgb3ANmAFsDK/PAI8BoaAc8D1iJA6oWbqEXXY6TOsHlazukhsUm9anN/UTzotsVt95swZUwc7JXFQnbA8JtQDVUv0qc8tn3H1syLPFAUkuoE7k3ajsnkAbIiIF+3cVGTH+C6hBMBq4HjSiKhLgXtAT+LsfQasiYjRVBEZrEACYDEwkDK1BircUwaSpFbefowB3RWJ/Av0TLeNaSciyyqUAFgELEmRWr0dqLu9KUQ+6IDIohQif3ZA5FGKxT4fGC/SDRTthIAFEfG61IhExCvgboXRuD1diSJ15FyFImdTFsSzFYqkfWnqedNzoYqzyKdqK6FES91S1cHqZEKRE1WeELsSpdh5tavq4+5SdahEiSv5eacjA4j56qkSJM6oC+sw2xpUbxcQuKXurdu0sSufNv6cT0Om4oX6Uz5lLG09RCKpbqAPWAUsn9R0jgA3IuI5c8wxR6VESYu7Jx8UzGvz1glgNCL+qVwk/zCzHfgK2AFsBGZakf8GbgGXgV+BKxHRSlUnFqs/qPcraOP/UL/PI11qoftWfWr1jKrfqPNmKrFWvWbnuaquKSrRn7+RuvBE3dmuxB71pfXjpfr1tHYtdQfwC7CgpiVjHPgyIoamFFGXA7/z9kN/nfkL2BwRj6YaB51ugATAR8Cp/51rqYeALxrUlexS97+XWvk+fRf4uGEt1jCwLiLevIvIgQZKAKwF9k1OrWMNbnyPAoTaCzyk2Df3OtACejOgv8ES77KqPwM+nwXnqm0ZsH4WiKzL8pFN01mdAR/OApGeLF/1TaeVAZdmgcjFUFcBN2njd4maMQpsyiLiIbAZ+JG3P7I0hbH8mfsiYuQ/Y2ZPZ0NMPQgAAAAASUVORK5CYII=',
                    }}
                  />
                </View>
                <View style={styles.messageContent}>
                  {friendlyNames[message.author] !== undefined ? (
                    <Text style={styles.messageSender}>
                      {friendlyNames[message.author]}{' '}
                      {message.author == deviceId ? '(ME)' : ''}
                    </Text>
                  ) : (
                    <Text style={styles.messageSender}>
                      {message.author}{' '}
                      {message.author == deviceId ? '(ME)' : ''}
                    </Text>
                  )}
                  <Text style={styles.messageText}>{message.content}</Text>
                </View>
                <View>
                  <Text></Text>
                  <Text style={styles.messageTimetoken}>
                    {convertTimetoken(message.timetoken)}
                  </Text>
                </View>

                <View
                  style={
                    message.author == deviceId
                      ? styles.avatarMe
                      : styles.avatarNone
                  }
                >
                  <Image
                    style={styles.logo}
                    source={{
                      uri:
                        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAA5CAYAAAB0+HhyAAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV9TpUWqInaQ4pChOlkQFXHUKhShQqgVWnUwufQLmjQkKS6OgmvBwY/FqoOLs64OroIg+AHi6OSk6CIl/i8ptIj14Lgf7+497t4BQr3MNKtrHNB020wl4mImuyoGXhHEIPowgIjMLGNOkpLoOL7u4ePrXYxndT735+hVcxYDfCLxLDNMm3iDeHrTNjjvE4dZUVaJz4nHTLog8SPXFY/fOBdcFnhm2Eyn5onDxGKhjZU2ZkVTI54ijqqaTvlCxmOV8xZnrVxlzXvyF4Zy+soy12kOI4FFLEGCCAVVlFCGjRitOikWUrQf7+CPuH6JXAq5SmDkWEAFGmTXD/4Hv7u18pMTXlIoDnS/OM7HCBDYBRo1x/k+dpzGCeB/Bq70lr9SB2Y+Sa+1tOgR0L8NXFy3NGUPuNwBhp4M2ZRdyU9TyOeB9zP6piwweAv0rHm9Nfdx+gCkqavkDXBwCIwWKHu9w7uD7b39e6bZ3w9BPXKTmZenygAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAAN1wAADdcBQiibeAAAAAd0SU1FB+YIEw4TFA++WWoAAALfSURBVGje7ZpNaxZXFICfMwbUxkZUqBJU0C78gApG20VFkdBWkErMQlFBF+K6tsv2X4h7V7qutqsWwQ/MQhFbN35sYtWgpVCjTTUq5n26cIQIDeSdzJ13JuTZDgPzzDn3nnPPTFAiagBbgb3ANmAFsDK/PAI8BoaAc8D1iJA6oWbqEXXY6TOsHlazukhsUm9anN/UTzotsVt95swZUwc7JXFQnbA8JtQDVUv0qc8tn3H1syLPFAUkuoE7k3ajsnkAbIiIF+3cVGTH+C6hBMBq4HjSiKhLgXtAT+LsfQasiYjRVBEZrEACYDEwkDK1BircUwaSpFbefowB3RWJ/Av0TLeNaSciyyqUAFgELEmRWr0dqLu9KUQ+6IDIohQif3ZA5FGKxT4fGC/SDRTthIAFEfG61IhExCvgboXRuD1diSJ15FyFImdTFsSzFYqkfWnqedNzoYqzyKdqK6FES91S1cHqZEKRE1WeELsSpdh5tavq4+5SdahEiSv5eacjA4j56qkSJM6oC+sw2xpUbxcQuKXurdu0sSufNv6cT0Om4oX6Uz5lLG09RCKpbqAPWAUsn9R0jgA3IuI5c8wxR6VESYu7Jx8UzGvz1glgNCL+qVwk/zCzHfgK2AFsBGZakf8GbgGXgV+BKxHRSlUnFqs/qPcraOP/UL/PI11qoftWfWr1jKrfqPNmKrFWvWbnuaquKSrRn7+RuvBE3dmuxB71pfXjpfr1tHYtdQfwC7CgpiVjHPgyIoamFFGXA7/z9kN/nfkL2BwRj6YaB51ugATAR8Cp/51rqYeALxrUlexS97+XWvk+fRf4uGEt1jCwLiLevIvIgQZKAKwF9k1OrWMNbnyPAoTaCzyk2Df3OtACejOgv8ES77KqPwM+nwXnqm0ZsH4WiKzL8pFN01mdAR/OApGeLF/1TaeVAZdmgcjFUFcBN2njd4maMQpsyiLiIbAZ+JG3P7I0hbH8mfsiYuQ/Y2ZPZ0NMPQgAAAAASUVORK5CYII=',
                    }}
                  />
                </View>

              </View>

              
            ))}
          </View>
        </ScrollView>
        {
          //  Text field to input messages and send button
        }
        <View style={styles.bottomContainer}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType='send'
            enablesReturnKeyAutomatically={true}
            placeholder='Type your message here...'
          />
          <View style={styles.submitButton}>
            <Button title='Send' onPress={handleSend} color='#33687B' />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default App
