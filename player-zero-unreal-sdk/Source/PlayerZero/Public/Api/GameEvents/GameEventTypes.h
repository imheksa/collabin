
#pragma once

#include "CoreMinimal.h"

template<typename TProps>
struct TGameEventWrapper
{
	FString Event;
	TProps Properties;

	TSharedPtr<FJsonObject> ToWrappedJson() const
	{
		TSharedPtr<FJsonObject> Inner = MakeShared<FJsonObject>();
		Inner->SetStringField(TEXT("event"), Event);
		Inner->SetObjectField(TEXT("properties"), Properties.ToJson());
		TSharedPtr<FJsonObject> Wrapper = MakeShared<FJsonObject>();
		Wrapper->SetObjectField(TEXT("data"), Inner);
		return Wrapper;
	}
};

template<typename T>
class TJsonSerializable
{
public:
	TSharedPtr<FJsonObject> ToJson() const
	{
		return static_cast<const T*>(this)->ToJson();
	}
};
