// Copyright Ready Player Me

#include "UI/SPlayerZeroDeveloperLoginWidget.h"
#include "Auth/DevAuthTokenCache.h"
#include "PlayerZero.h"
#include "SlateOptMacros.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Auth/Models/DeveloperAuth.h"
#include "UI/SPlayerZeroLoginPanel.h"
#include "UI/SPlayerZeroSettingsPanel.h"

BEGIN_SLATE_FUNCTION_BUILD_OPTIMIZATION

void SPlayerZeroDeveloperLoginWidget::Construct(const FArguments& InArgs)
{
	FDeveloperAuth AuthData = FDevAuthTokenCache::GetAuthData();

	bIsLoggedIn = false;
	if(AuthData.IsValid())
	{
		FDevAuthTokenCache::SetAuthData(AuthData);
		bIsLoggedIn = AuthData.IsValid();
		UserName = AuthData.Name;
	}
	else
	{
		UserName = "User";
		FDevAuthTokenCache::ClearAuthData();
	}
	ChildSlot
	[
		SNew(SVerticalBox)
		+ SVerticalBox::Slot()
		[
			SAssignNew(LoginPanel, SPlayerZeroLoginPanel)
			.Visibility(this, &SPlayerZeroDeveloperLoginWidget::GetLoginPanelVisibility)
		]
		+ SVerticalBox::Slot()
		[
			SAssignNew(SettingsPanel, SPlayerZeroSettingsPanel)
			.Visibility(this, &SPlayerZeroDeveloperLoginWidget::GetSettingsPanelVisibility)
		]
	];

	if(LoginPanel)
	{
		LoginPanel->OnLoginSuccess.BindRaw( this, &SPlayerZeroDeveloperLoginWidget::HandleLogin );
	}

	if(SettingsPanel)
	{
		SettingsPanel->OnLogout.BindRaw( this, &SPlayerZeroDeveloperLoginWidget::HandleLogout );
		if(bIsLoggedIn)
		{
			SettingsPanel->RunPanelSetup(UserName);
		}
	}

	SetLoggedInState(bIsLoggedIn);
}

SPlayerZeroDeveloperLoginWidget::~SPlayerZeroDeveloperLoginWidget()
{
}

void SPlayerZeroDeveloperLoginWidget::HandleLogin(const FString& String)
{
	UE_LOG(LogPlayerZero, Log, TEXT("Login success: %s"), *String);
	if(SettingsPanel)
	{
		SettingsPanel->RunPanelSetup(String);
	}
	SetLoggedInState(true);
}

void SPlayerZeroDeveloperLoginWidget::HandleLogout()
{
	SetLoggedInState(false);
}

void SPlayerZeroDeveloperLoginWidget::SetLoggedInState(bool IsLoggedIn)
{
	bIsLoggedIn = IsLoggedIn;
	Invalidate(EInvalidateWidget::Layout); 
}

EVisibility SPlayerZeroDeveloperLoginWidget::GetLoginPanelVisibility() const
{
	return bIsLoggedIn ? EVisibility::Collapsed : EVisibility::Visible;
}

EVisibility SPlayerZeroDeveloperLoginWidget::GetSettingsPanelVisibility() const
{
	return bIsLoggedIn ? EVisibility::Visible : EVisibility::Collapsed;
}

END_SLATE_FUNCTION_BUILD_OPTIMIZATION
