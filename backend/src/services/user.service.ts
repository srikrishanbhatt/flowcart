import { userRepository } from '../repositories/user.repository.js'
import type { CreateUserInput, User } from '../types/user.js'

export class UserService {
  async listUsers(): Promise<User[]> {
    return userRepository.listUsers()
  }

  async createUser(input: CreateUserInput): Promise<User> {
    return userRepository.createUser(input)
  }
}

export const userService = new UserService()
