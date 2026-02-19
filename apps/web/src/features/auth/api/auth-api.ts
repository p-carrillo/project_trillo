import type {
  AuthSessionResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  UpdateUserProfileRequest,
  UserDto,
  UserResponse
} from '@trillo/contracts';
import { isApiRequestError, requestJson } from '../../shared/api/api-request';

const BASE_PATH = '/api/v1';

export async function registerUser(input: RegisterRequest): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>(`${BASE_PATH}/auth/register`, {
    method: 'POST',
    withAuth: false,
    body: JSON.stringify(input)
  });
}

export async function loginUser(input: LoginRequest): Promise<AuthSessionResponse> {
  return requestJson<AuthSessionResponse>(`${BASE_PATH}/auth/login`, {
    method: 'POST',
    withAuth: false,
    body: JSON.stringify(input)
  });
}

export async function fetchMe(): Promise<UserDto> {
  const response = await requestJson<UserResponse>(`${BASE_PATH}/auth/me`);
  return response.data;
}

export async function updateMyProfile(input: UpdateUserProfileRequest): Promise<UserDto> {
  const response = await requestJson<UserResponse>(`${BASE_PATH}/users/me/profile`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });

  return response.data;
}

export async function changeMyPassword(input: ChangePasswordRequest): Promise<void> {
  await requestJson<void>(`${BASE_PATH}/users/me/password`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export const isAuthApiError = isApiRequestError;
