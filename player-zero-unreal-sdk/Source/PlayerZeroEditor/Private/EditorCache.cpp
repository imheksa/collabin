#include "EditorCache.h"
#include "Misc/ConfigCacheIni.h"

#define RPM_CACHE_SECTION TEXT("ReadyPlayerMeCache")

void FEditorCache::SetString( const FString& Key, const FString& Value)
{
    GConfig->SetString(RPM_CACHE_SECTION, *Key, *Value, GEditorPerProjectIni);
    GConfig->Flush(false, GEditorPerProjectIni);
}

void FEditorCache::SetInt(const FString& Key, int32 Value)
{
    GConfig->SetInt(RPM_CACHE_SECTION, *Key, Value, GEditorPerProjectIni);
    GConfig->Flush(false, GEditorPerProjectIni);
}

void FEditorCache::SetFloat(const FString& Key, float Value)
{
    GConfig->SetFloat(RPM_CACHE_SECTION, *Key, Value, GEditorPerProjectIni);
    GConfig->Flush(false, GEditorPerProjectIni);
}

void FEditorCache::SetBool(const FString& Key, bool Value)
{
    GConfig->SetBool(RPM_CACHE_SECTION, *Key, Value, GEditorPerProjectIni);
    GConfig->Flush(false, GEditorPerProjectIni);
}

FString FEditorCache::GetString(const FString& Key, const FString& DefaultValue)
{
    FString Value;
    if (GConfig->GetString(RPM_CACHE_SECTION, *Key, Value, GEditorPerProjectIni))
    {
        return Value;
    }
    return DefaultValue;
}

int32 FEditorCache::GetInt(const FString& Key, int32 DefaultValue)
{
    int32 Value;
    if (GConfig->GetInt(RPM_CACHE_SECTION, *Key, Value, GEditorPerProjectIni))
    {
        return Value;
    }
    return DefaultValue;
}

float FEditorCache::GetFloat(const FString& Key, float DefaultValue)
{
    float Value;
    if (GConfig->GetFloat(RPM_CACHE_SECTION, *Key, Value, GEditorPerProjectIni))
    {
        return Value;
    }
    return DefaultValue;
}

bool FEditorCache::GetBool(const FString& Key, bool DefaultValue)
{
    bool Value;
    if (GConfig->GetBool(RPM_CACHE_SECTION, *Key, Value, GEditorPerProjectIni))
    {
        return Value;
    }
    return DefaultValue;
}

void FEditorCache::RemoveKey(const FString& Key)
{
    GConfig->RemoveKey(RPM_CACHE_SECTION, *Key, GEditorPerProjectIni);
    GConfig->Flush(false, GEditorPerProjectIni);
}