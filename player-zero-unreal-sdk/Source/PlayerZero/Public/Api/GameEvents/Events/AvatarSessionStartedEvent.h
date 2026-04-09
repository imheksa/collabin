#pragma once


struct PLAYERZERO_API FAvatarSessionStartedProperties : TJsonSerializable<FAvatarSessionStartedProperties>
{
	FString AvatarId;
	FString AvatarType = "fullbody";
	FString GameId;
	FString GameSessionId;
	FString SessionId;
	FString SdkVersion;
	FString SdkPlatform;
	
	// TODO add device context;

	TSharedPtr<FJsonObject> ToJson() const
	{
		TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
		Json->SetStringField(TEXT("avatar_id"), AvatarId);
		Json->SetStringField(TEXT("avatar_type"), AvatarType);
		Json->SetStringField(TEXT("game_id"), GameId);
		Json->SetStringField(TEXT("game_session_id"), GameSessionId);
		Json->SetStringField(TEXT("avatar_session_id"), SessionId);
		Json->SetStringField(TEXT("sdk_version"), SdkVersion);
		Json->SetStringField(TEXT("sdk_platform"), SdkPlatform);
		return Json;
	}
};