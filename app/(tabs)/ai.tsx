import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '../../stores/useProfileStore';
import { usePlanStore } from '../../stores/usePlanStore';
import { AiAssistantService } from '../../services/aiAssistant';
import { Colors, Typography, Spacing, Radius, MIN_TAP_TARGET } from '../../constants/theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ChatMessage } from '../../types';

export default function AiChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const profile = useProfileStore((s) => s.profile);
  const history = useProfileStore((s) => s.history);
  const chatHistory = useProfileStore((s) => s.chatHistory);
  const addChatMessage = useProfileStore((s) => s.addChatMessage);
  const clearChat = useProfileStore((s) => s.clearChat);
  const plans = usePlanStore((s) => s.plans);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(profile.aiSettings.primaryModel);

  const availableModels = profile.aiSettings.providers.flatMap((p) => p.models);

  useEffect(() => {
    // scroll to the bottom when new messages arrive
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    const currentInput = input;
    setInput('');
    await addChatMessage(userMsg);
    setIsLoading(true);

    try {
      const response = await AiAssistantService.sendMessage(
        [...chatHistory, userMsg],
        {
          ...profile.aiSettings,
          primaryModel: selectedModel,
        },
        { history, plans, weightLogs: profile.bodyWeightLog }
      );
      await addChatMessage(response);
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: `Error: ${e.message}`,
        timestamp: new Date().toISOString(),
        modelDisplayName: 'System',
      };
      await addChatMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    Alert.alert(
      'New Chat',
      'This will delete the current chat history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Chat', style: 'destructive', onPress: clearChat },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader 
        title="AI Assistant" 
        rightElement={
          <TouchableOpacity onPress={handleNewChat} style={styles.headerAction}>
            <Text style={styles.headerPlus}>+</Text>
          </TouchableOpacity>
        }
      />

      {/* model selection */}
      <View style={styles.modelSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelList}>
          {availableModels.map((model) => (
            <TouchableOpacity
              key={model}
              style={[styles.modelTab, selectedModel === model && styles.modelTabActive]}
              onPress={() => setSelectedModel(model)}
            >
              <Text style={[styles.modelTabText, selectedModel === model && styles.modelTabTextActive]}>
                {model}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {chatHistory.length === 0 && (
            <View style={styles.welcome}>
              <Text style={styles.welcomeEmoji}>🤖</Text>
              <Text style={styles.welcomeTitle}>How can I help you train?</Text>
              <Text style={styles.welcomeText}>
                I can analyze your progression, compare logs, or explain your training plans.
              </Text>
            </View>
          )}

          {chatHistory.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageContainer,
                msg.role === 'user' ? styles.userContainer : styles.assistantContainer,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={[styles.messageText, msg.role === 'user' && styles.userText]}>
                  {msg.content}
                </Text>
              </View>
              {msg.modelDisplayName && (
                <Text style={styles.modelInfo}>{msg.modelDisplayName}</Text>
              )}
            </View>
          ))}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.textSecondary} size="small" />
              <Text style={styles.loadingText}>AI thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { paddingBottom: Math.max(Spacing.base, insets.bottom) }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your training..."
            placeholderTextColor={Colors.textDisabled}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  chatContent: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerAction: {
    paddingHorizontal: Spacing.sm,
  },
  headerPlus: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: Typography.regular,
    lineHeight: 36,
  },
  modelSelector: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modelList: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  modelTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelTabActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  modelTabText: {
    color: Colors.textSecondary,
    fontSize: Typography.xs,
  },
  modelTabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
  welcome: {
    marginTop: 60,
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
  },
  welcomeEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  welcomeTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    textAlign: 'center',
  },
  welcomeText: {
    color: Colors.textDisabled,
    fontSize: Typography.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageContainer: {
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: Radius.sm,
  },
  messageText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  userText: {
    color: Colors.bg,
    fontWeight: Typography.medium,
  },
  modelInfo: {
    fontSize: 10,
    color: Colors.textDisabled,
    marginTop: 4,
    marginHorizontal: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.base,
    gap: Spacing.sm,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    fontSize: Typography.base,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    minHeight: MIN_TAP_TARGET,
    maxHeight: 120,
  },
  sendBtn: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceRaised,
    opacity: 0.5,
  },
  sendBtnText: {
    color: Colors.bg,
    fontWeight: Typography.bold,
    fontSize: Typography.xs,
  },
});
