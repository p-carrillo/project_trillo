export class UserDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidUsernameError extends UserDomainError {
  constructor() {
    super(
      'invalid_username',
      'Username must have between 3 and 32 characters and only use letters, numbers, dot, underscore or hyphen.'
    );
  }
}

export class InvalidEmailError extends UserDomainError {
  constructor() {
    super('invalid_email', 'Email format is invalid.');
  }
}

export class InvalidDisplayNameError extends UserDomainError {
  constructor() {
    super('invalid_display_name', 'Display name must have between 2 and 120 characters.');
  }
}

export class InvalidPasswordError extends UserDomainError {
  constructor() {
    super('invalid_password', 'Password must have between 8 and 120 characters.');
  }
}

export class UserNotFoundError extends UserDomainError {
  constructor(userId: string) {
    super('user_not_found', `User ${userId} was not found.`);
  }
}

export class UsernameTakenError extends UserDomainError {
  constructor(username: string) {
    super('username_taken', `Username ${username} is already taken.`);
  }
}

export class EmailTakenError extends UserDomainError {
  constructor(email: string) {
    super('email_taken', `Email ${email} is already taken.`);
  }
}

export class InvalidCredentialsError extends UserDomainError {
  constructor() {
    super('invalid_credentials', 'Invalid username or password.');
  }
}

export class UnauthorizedError extends UserDomainError {
  constructor(message = 'Missing or invalid authentication token.') {
    super('unauthorized', message);
  }
}
