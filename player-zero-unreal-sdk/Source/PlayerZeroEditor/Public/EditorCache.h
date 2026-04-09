#pragma once

#include "CoreMinimal.h"

class PLAYERZEROEDITOR_API FEditorCache
{
public:
	static void SetString(const FString& Key, const FString& Value);
	static void SetInt(const FString& Key, int32 Value);
	static void SetFloat(const FString& Key, float Value);
	static void SetBool(const FString& Key, bool Value);
	
	static FString GetString(const FString& Key, const FString& DefaultValue = TEXT(""));
	static int32 GetInt(const FString& Key, int32 DefaultValue = 0);
	static float GetFloat(const FString& Key, float DefaultValue = 0.0f);
	static bool GetBool(const FString& Key, bool DefaultValue = false);
	
	static void RemoveKey(const FString& Key);
};
