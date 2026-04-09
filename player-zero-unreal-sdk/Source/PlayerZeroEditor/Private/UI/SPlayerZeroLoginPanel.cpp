#include "UI/SPlayerZeroLoginPanel.h"
#include "EditorCache.h"
#include "Auth/DevAuthTokenCache.h"
#include "Auth/DeveloperAuthApi.h"
#include "Auth/Models/DeveloperAuth.h"
#include "Auth/Models/DeveloperLoginRequest.h"
#include "Settings/PlayerZeroDeveloperSettings.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Input/SButton.h"

void SPlayerZeroLoginPanel::Construct(const FArguments& InArgs)
{
	ChildSlot
	[
		SNew(SVerticalBox)
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10)
		[
			SNew(STextBlock)
			.Text(FText::FromString("Sign in with your Player Zero developer account"))
			.Font(FSlateFontInfo(FPaths::EngineContentDir() / TEXT("Slate/Fonts/Roboto-Bold.ttf"), 16))
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10, 5)
		[
			SNew(STextBlock)
			.Text(FText::FromString("Email:"))
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10, 5)
		[
			SAssignNew(EmailTextBox, SEditableTextBox)
			.OnTextChanged(this, &SPlayerZeroLoginPanel::OnTextChanged)
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10, 0)
		[
			SAssignNew(EmailErrorText, STextBlock)
			.Text(FText::FromString("Email is required."))
			.ColorAndOpacity(FSlateColor(FLinearColor::Red))
			.Visibility(EVisibility::Collapsed) // Initially hidden
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10, 5)
		[
			SNew(STextBlock)
			.Text(FText::FromString("Password:"))
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10, 5)
		[
			SAssignNew(PasswordTextBox, SEditableTextBox)
			.IsPassword(true)
			.OnTextChanged(this, &SPlayerZeroLoginPanel::OnTextChanged)
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10, 0)
		[
			SAssignNew(PasswordErrorText, STextBlock)
			.Text(FText::FromString("Password is required."))
			.ColorAndOpacity(FSlateColor(FLinearColor::Red))
			.Visibility(EVisibility::Collapsed) // Initially hidden
		]        
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10)
		[
			SNew(SButton)
			.Text(FText::FromString("Login"))
			.OnClicked(this, &SPlayerZeroLoginPanel::OnLoginClicked)
			.IsEnabled(this, &SPlayerZeroLoginPanel::IsInputTextValid) // Bind to enable/disable button
		]
		+ SVerticalBox::Slot()
		.AutoHeight()
		.Padding(10, 0)
		[
			SAssignNew(LoginErrorText, STextBlock)
			.Text(FText::FromString("Login failed. Please check your credentials."))
			.ColorAndOpacity(FSlateColor(FLinearColor::Red))
			.Visibility(EVisibility::Collapsed) // Initially hidden
		]
	];
	
	Initialize();
	UpdateErrorMessages();
}

void SPlayerZeroLoginPanel::Initialize()
{
	EmailTextBox->SetText(FText::FromString(FEditorCache::GetString(CacheKeyEmail)));
	if(!DeveloperAuthApi.IsValid())
	{
		DeveloperAuthApi = MakeShared<FDeveloperAuthApi>();
	}
}

FReply SPlayerZeroLoginPanel::OnLoginClicked()
{
	bFailedLogin = false;
	UpdateErrorMessages();
	UPlayerZeroDeveloperSettings* RpmSettings = GetMutableDefault<UPlayerZeroDeveloperSettings>();
	FString Email = EmailTextBox->GetText().ToString();
	FString Password = PasswordTextBox->GetText().ToString();
	FEditorCache::SetString(CacheKeyEmail, Email);
	Email = Email.TrimStartAndEnd();
	Password = Password.TrimStartAndEnd();
	const FDeveloperLoginRequest LoginRequest = FDeveloperLoginRequest(Email, Password);
	DeveloperAuthApi->LoginWithEmail(LoginRequest,FOnDeveloperLoginResponse::CreateLambda(
		[this](const FDeveloperLoginResponse& Response, bool bWasSuccessful)
		{
			this->HandleLoginResponse(Response, bWasSuccessful);
		})); 
	return FReply::Handled();
}

void SPlayerZeroLoginPanel::HandleLoginResponse(const FDeveloperLoginResponse& Response, bool bWasSuccessful)
{
	if (bWasSuccessful)
	{
		const FDeveloperAuth AuthData = FDeveloperAuth(Response.Data);
		FDevAuthTokenCache::SetAuthData(AuthData);
		OnLoginSuccess.ExecuteIfBound(Response.Data.Name);
		return;
	}
	bFailedLogin = true;
	UE_LOG(LogPlayerZero, Error, TEXT("Login request failed"));
	FDevAuthTokenCache::ClearAuthData();
	UpdateErrorMessages();
}

void SPlayerZeroLoginPanel::OnTextChanged(const FText& Text)
{
	UpdateErrorMessages();
}

void SPlayerZeroLoginPanel::UpdateErrorMessages()
{
	EmailErrorText->SetVisibility(EmailTextBox->GetText().IsEmpty() ? EVisibility::Visible : EVisibility::Collapsed);
	PasswordErrorText->SetVisibility(PasswordTextBox->GetText().IsEmpty() ? EVisibility::Visible : EVisibility::Collapsed);
	LoginErrorText->SetVisibility(bFailedLogin ? EVisibility::Visible : EVisibility::Collapsed);
}

bool SPlayerZeroLoginPanel::IsInputTextValid() const
{
	return !EmailTextBox->GetText().IsEmpty() && !PasswordTextBox->GetText().IsEmpty();
}
