import { primaryRepository } from '../repositories/primaryRepository';
import { secondaryRepository } from '../repositories/secondaryRepository';

export class UserService {
  async createUser(userData: any): Promise<any> {
    try {
      // First, create the user in the primary database
      const newUser = await primaryRepository.create(userData);
      
      // Then, log this action in the secondary database
    //   await secondaryRepository.createLog({
    //     action: 'USER_CREATED',
    //     userId: newUser.id,
    //     details: `User ${newUser.name} was created with email ${newUser.email}`
    //   });
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<any> {
    try {
      // Get user data from primary database
      const user = await primaryRepository.findById(id);
      console.log("🚀 ~ UserService ~ getUserById ~ user:", user)
      
      // Log this access in the secondary database
      if (user) {
        // await secondaryRepository.createLog({
        //   action: 'USER_ACCESSED',
        //   userId: id,
        //   details: `User ${user.name} was accessed`
        // });
      }
      
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }
  
  // Add other business logic methods as needed
}

export const userService = new UserService();
