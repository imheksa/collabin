#pragma once
#include "Api/GameEvents/GameEventTypes.h"

struct PLAYERZERO_API FGameMatchStartedEventProperties : TJsonSerializable<FGameMatchStartedEventProperties>
{
	FString AvatarId;
	FString ApplicationId;
	FString ProductName;
	FString GameId;
	FString GameSessionId;
	FString SessionId;
	FString StartContext;
	FString LiveOpsId;
	FString Tier;
	int32 Round;
	FString MapId;
	FString GameMode;
	FString Class;
	FString Team;
	TMap<FString, FString> Loadout;
	FString LobbyId;

	TSharedPtr<FJsonObject> ToJson() const
	{
		TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
		Json->SetStringField(TEXT("avatar_id"), AvatarId);
		Json->SetStringField(TEXT("application_id"), ApplicationId);
		Json->SetStringField(TEXT("product_name"), ProductName);
		Json->SetStringField(TEXT("game_id"), GameId);
		Json->SetStringField(TEXT("game_session_id"), GameSessionId);
		Json->SetStringField(TEXT("game_match_id"), SessionId);
		Json->SetStringField(TEXT("start_context"), StartContext);
		Json->SetStringField(TEXT("live_ops_id"), LiveOpsId);
		Json->SetStringField(TEXT("tier"), Tier);
		Json->SetNumberField(TEXT("round"), Round);
		Json->SetStringField(TEXT("map_id"), MapId);
		Json->SetStringField(TEXT("game_mode"), GameMode);
		Json->SetStringField(TEXT("class"), Class);
		Json->SetStringField(TEXT("team"), Team);

		TSharedPtr<FJsonObject> LoadoutJson = MakeShared<FJsonObject>();
		for (const auto& Pair : Loadout)
		{
			LoadoutJson->SetStringField(Pair.Key, Pair.Value);
		}
		Json->SetObjectField(TEXT("loadout"), LoadoutJson);

		return Json;
	}
};