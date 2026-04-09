#pragma once

UENUM(BlueprintType)
enum class EApiRequestStrategy : uint8
{
	ApiOnly UMETA(DisplayName = "API only"),
	FallbackToCache UMETA(DisplayName = "Fallback to Cache"),
	CacheOnly UMETA(DisplayName = "Cache only")
};