#pragma once
#include "Api/GameEvents/GameEventTypes.h"

struct PLAYERZERO_API FAvatarSessionHeartbeatProperties : TJsonSerializable<FAvatarSessionHeartbeatProperties>
{
	FString SessionId;

	FString GameId;

	int64 LastAvatarActivityAt;

	TSharedPtr<FJsonObject> ToJson() const
	{
		TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
		Json->SetStringField(TEXT("avatar_session_id"), SessionId);
		Json->SetStringField(TEXT("game_id"), GameId);
		Json->SetNumberField(TEXT("last_avatar_activity_at"), LastAvatarActivityAt);
		return Json;
	}
};