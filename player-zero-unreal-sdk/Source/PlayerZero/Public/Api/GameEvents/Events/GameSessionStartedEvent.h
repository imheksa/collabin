#pragma once
#include "Api/GameEvents/GameEventTypes.h"

struct PLAYERZERO_API FGameSessionStartedEventProperties : TJsonSerializable<FGameSessionStartedEventProperties>
{
	FString AvatarId;
	FString ApplicationId;
	FString ProductName;
	FString GameId;
	FString SessionId;
	FString GameEntryPoint;
	FString LiveOpsId;

	TSharedPtr<FJsonObject> ToJson() const
	{
		TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
		Json->SetStringField(TEXT("avatar_id"), AvatarId);
		Json->SetStringField(TEXT("application_id"), ApplicationId);
		Json->SetStringField(TEXT("product_name"), ProductName);
		Json->SetStringField(TEXT("game_id"), GameId);
		Json->SetStringField(TEXT("game_session_id"), SessionId);
		Json->SetStringField(TEXT("game_entry_point"), GameEntryPoint);
		Json->SetStringField(TEXT("live_ops_id"), LiveOpsId);
		return Json;
	}
};