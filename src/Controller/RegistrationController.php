<?php
namespace App\Controller;
use App\Entity\User;
use App\Form\RegistrationForm;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class RegistrationController extends AbstractController
{
    #[Route('/register', name: 'app_register')]
    public function register(Request $request, UserPasswordHasherInterface $userPasswordHasher, EntityManagerInterface $entityManager): Response
    {
        $user = new User();
        $form = $this->createForm(RegistrationForm::class, $user);
        $form->handleRequest($request);
       
        if ($form->isSubmitted() && $form->isValid()) {
            /** @var string $plainPassword */
            $plainPassword = $form->get('plainPassword')->getData();
           
            // encode the plain password
            $user->setPassword($userPasswordHasher->hashPassword($user, $plainPassword));
           
            $entityManager->persist($user);
            $entityManager->flush();
           
            // Ajouter un message de succès avec information sur la validation admin
            $this->addFlash('success', 
                'Inscription réussie ! Votre compte a été créé avec succès. ' .
                'Veuillez attendre qu\'un administrateur confirme votre accès pour vous connecter.'
            );
           
            // Rediriger vers la page de connexion
            return $this->redirectToRoute('app_login');
        }
       
        return $this->render('registration/register.html.twig', [
            'registrationForm' => $form,
        ]);
    }
}