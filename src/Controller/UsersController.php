<?php
namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Repository\GroupRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ADMIN')]
final class UsersController extends AbstractController
{
    #[Route('/users', name: 'app_users')]
    public function index(UserRepository $userRepository): Response
    {
        $users = $userRepository->findAll();
        return $this->render('users/index.html.twig', [
            'users' => $users,
        ]);
    }

    #[Route('/users/{id}', name: 'app_users_show', methods: ['GET'])]
    public function show(User $user, GroupRepository $groupRepository): Response
    {
        // Récupérer les groupes pour afficher les informations sur les rôles
        $groups = $groupRepository->findAll();
        
        return $this->render('users/show.html.twig', [
            'user' => $user,
            'groups' => $groups,
        ]);
    }

    #[Route('/users/{id}/edit', name: 'app_users_edit', methods: ['GET', 'POST'])]
    public function edit(Request $request, User $user, EntityManagerInterface $entityManager, GroupRepository $groupRepository): Response
    {
        if ($request->isMethod('POST')) {
            $email = $request->request->get('email');
            $roles = $request->request->all('roles') ?? [];
           
            // Supprimer les valeurs vides
            $roles = array_filter($roles);
            
            // S'assurer que ROLE_USER est toujours présent
            if (!in_array('ROLE_USER', $roles)) {
                $roles[] = 'ROLE_USER';
            }
           
            // Validation de l'email
            if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $user->setEmail($email);
            } elseif ($email) {
                $this->addFlash('error', 'L\'adresse email n\'est pas valide.');
                return $this->redirectToRoute('app_users_edit', ['id' => $user->getId()]);
            }
           
            $user->setRoles($roles);
           
            try {
                $entityManager->flush();
                $this->addFlash('success', 'Utilisateur modifié avec succès !');
                return $this->redirectToRoute('app_users_show', ['id' => $user->getId()]);
            } catch (\Exception $e) {
                $this->addFlash('error', 'Erreur lors de la modification : ' . $e->getMessage());
                return $this->redirectToRoute('app_users_edit', ['id' => $user->getId()]);
            }
        }

        // Récupérer tous les groupes pour les rôles
        $groups = $groupRepository->findAll();
        
        // Rôles système de base
        $systemRoles = ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_ACCESS'];
        
        return $this->render('users/edit.html.twig', [
            'user' => $user,
            'groups' => $groups,
            'system_roles' => $systemRoles,
            'available_roles' => $systemRoles, // Pour la compatibilité avec l'ancien template
        ]);
    }

    #[Route('/users/{id}/delete', name: 'app_users_delete', methods: ['POST'])]
    public function delete(Request $request, User $user, EntityManagerInterface $entityManager): Response
    {
        // Vérifier qu'on ne supprime pas son propre compte
        if ($user === $this->getUser()) {
            $this->addFlash('error', 'Vous ne pouvez pas supprimer votre propre compte !');
            return $this->redirectToRoute('app_users');
        }

        try {
            $entityManager->remove($user);
            $entityManager->flush();
            $this->addFlash('success', 'Utilisateur supprimé avec succès !');
        } catch (\Exception $e) {
            $this->addFlash('error', 'Erreur lors de la suppression : ' . $e->getMessage());
        }
       
        return $this->redirectToRoute('app_users');
    }

    #[Route('/users/{id}/reset-password', name: 'app_users_reset_password', methods: ['POST'])]
    public function resetPassword(
        Request $request,
        User $user,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher
    ): Response {
        $newPassword = $request->request->get('new_password');
       
        if ($newPassword) {
            try {
                $hashedPassword = $passwordHasher->hashPassword($user, $newPassword);
                $user->setPassword($hashedPassword);
                $entityManager->flush();
                $this->addFlash('success', 'Mot de passe réinitialisé avec succès !');
            } catch (\Exception $e) {
                $this->addFlash('error', 'Erreur lors de la réinitialisation : ' . $e->getMessage());
            }
        } else {
            $this->addFlash('error', 'Veuillez fournir un nouveau mot de passe !');
        }
       
        return $this->redirectToRoute('app_users_show', ['id' => $user->getId()]);
    }

    #[Route('/users/{id}/assign-groups', name: 'app_users_assign_groups', methods: ['POST'])]
    public function assignGroups(Request $request, User $user, EntityManagerInterface $entityManager, GroupRepository $groupRepository): Response
    {
        $groupIds = $request->request->all('group_ids') ?? [];
        
        // Récupérer les rôles actuels de l'utilisateur (en gardant les rôles système)
        $currentRoles = $user->getRoles();
        $systemRoles = array_filter($currentRoles, function($role) {
            return in_array($role, ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_ACCESS']);
        });
        
        // Récupérer les nouveaux rôles de groupes
        $groupRoles = [];
        if (!empty($groupIds)) {
            $groups = $groupRepository->findBy(['id' => $groupIds]);
            foreach ($groups as $group) {
                $groupRoles[] = $group->getRole();
            }
        }
        
        // Combiner les rôles système et les rôles de groupes
        $newRoles = array_merge($systemRoles, $groupRoles);
        $user->setRoles(array_unique($newRoles));
        
        try {
            $entityManager->flush();
            $this->addFlash('success', 'Groupes assignés avec succès !');
        } catch (\Exception $e) {
            $this->addFlash('error', 'Erreur lors de l\'assignation : ' . $e->getMessage());
        }
        
        return $this->redirectToRoute('app_users_show', ['id' => $user->getId()]);
    }
}