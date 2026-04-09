#pragma once
#include "Api/GameEvents/GameEventTypes.h"

struct PLAYERZERO_API FGameSessionEndedEventProperties : TJsonSerializable<FGameSessionEndedEventProperties>
{
	FString SessionId;
	FString GameId;
	int32 MatchesPlayed;
	int32 MatchesWon;
	int32 Score;
	TMap<FString, FString> CurrencyObtained = TMap<FString, FString>();

	TSharedPtr<FJsonObject> ToJson() const
	{
		TSharedPtr<FJsonObject> Json = MakeShared<FJsonObject>();
		Json->SetStringField(TEXT("game_session_id"), SessionId);
		Json->SetStringField(TEXT("game_id"), GameId);
		Json->SetNumberField(TEXT("matches_played"), MatchesPlayed);
		Json->SetNumberField(TEXT("matches_won"), MatchesWon);
		Json->SetNumberField(TEXT("score"), Score);
		
		TSharedPtr<FJsonObject> CurrencyJson = MakeShared<FJsonObject>();
		for (const auto& Pair : CurrencyObtained)
		{
			CurrencyJson->SetStringField(Pair.Key, Pair.Value);
		}
		Json->SetObjectField(TEXT("currency_obtained"), CurrencyJson);

		return Json;
	}
};