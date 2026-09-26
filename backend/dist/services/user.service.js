import { userRepository } from '../repositories/user.repository.js';
export class UserService {
    async listUsers() {
        return userRepository.listUsers();
    }
    async createUser(input) {
        return userRepository.createUser(input);
    }
}
export const userService = new UserService();
