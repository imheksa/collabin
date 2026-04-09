#pragma once
#include "Api/GameEvents/GameEventTypes.h"

struct PLAYERZERO_API FAvatarSessionEndedProperties : TJsonSerializable<FAvatarSessionEndedProperties>
{
	FString SessionId;
	FString GameId;

	TSharedPtr<FJsonObject> ToJson() const 
	{
		TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
		Json->SetStringField(TEXT("avatar_session_id"), SessionId);
		Json->SetStringField(TEXT("game_id"), GameId);
		return Json;
	}
};