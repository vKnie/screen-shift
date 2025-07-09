<?php
namespace App\Form;

use App\Entity\Picture;
use App\Entity\Screen;
use App\Repository\ScreenRepository;
use App\Service\PdfConverterService;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\Extension\Core\Type\ColorType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Vich\UploaderBundle\Form\Type\VichImageType;

class PictureForm extends AbstractType
{
    private AuthorizationCheckerInterface $authorizationChecker;
    private TokenStorageInterface $tokenStorage;
    private PdfConverterService $pdfConverter;

    public function __construct(
        AuthorizationCheckerInterface $authorizationChecker,
        TokenStorageInterface $tokenStorage,
        PdfConverterService $pdfConverter
    ) {
        $this->authorizationChecker = $authorizationChecker;
        $this->tokenStorage = $tokenStorage;
        $this->pdfConverter = $pdfConverter;
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $maxSizeMB = $this->pdfConverter->getMaxFileSizeMB();
        $maxPages = $this->pdfConverter->getMaxPages();
        
        $builder
            ->add('delay')
            ->add('startDate', DateType::class, [
                'required' => false,
                'widget' => 'single_text',
                'html5' => true,
                'attr' => ['class' => 'form-control'],
                'help' => 'Laisser vide pour démarrage immédiat'
            ])
            ->add('endDate', DateType::class, [
                'required' => false,
                'widget' => 'single_text', 
                'html5' => true,
                'attr' => ['class' => 'form-control'],
                'help' => 'Laisser vide pour affichage permanent'
            ])
            ->add('backgroundColor', ColorType::class, [
                'label' => 'Couleur de fond',
                'attr' => [
                    'class' => 'form-control form-control-color',
                    'style' => 'width: 100px; height: 50px;'
                ]
            ])
            ->add('imageFile', VichImageType::class, [
                'required' => false,
                'label' => 'Image (PNG, JPEG...) ou PDF',
                'allow_delete' => false,
                'download_uri' => false,
                'image_uri' => false,
                'attr' => [
                    'accept' => 'image/*,application/pdf',
                    'data-max-size' => $maxSizeMB,
                    'data-max-pages' => $maxPages
                ],
                'help' => "Formats acceptés : PNG, JPEG, GIF, SVG, PDF (max {$maxSizeMB}MB, {$maxPages} pages max pour PDF)"
            ])
            ->add('screens', EntityType::class, [
                'class' => Screen::class,
                'choice_label' => function (Screen $screen) {
                    return $screen->getName() . ' (' . $screen->getGroupeScreen()->getName() . ')';
                },
                'choice_attr' => function (Screen $screen) {
                    return [
                        'data-role' => $screen->getGroupeScreen()->getRole(),
                        'data-group' => $screen->getGroupeScreen()->getName()
                    ];
                },
                'label' => 'Écrans',
                'multiple' => true,
                'expanded' => true,
                'by_reference' => false,
                'attr' => [
                    'class' => 'screen-checkboxes'
                ],
                'query_builder' => function (ScreenRepository $er) {
                    $user = $this->getUser();
                    
                    // Si l'utilisateur est admin, il voit tous les screens
                    if ($this->authorizationChecker->isGranted('ROLE_ADMIN')) {
                        return $er->createQueryBuilder('s')
                            ->join('s.groupeScreen', 'g')
                            ->orderBy('g.name', 'ASC')
                            ->addOrderBy('s.name', 'ASC');
                    }
                    
                    // Récupérer les rôles de l'utilisateur
                    $userRoles = $user ? $user->getRoles() : [];
                    
                    // Filtrer les screens selon les rôles de l'utilisateur
                    $qb = $er->createQueryBuilder('s')
                        ->join('s.groupeScreen', 'g')
                        ->where('g.role IN (:roles)')
                        ->setParameter('roles', $userRoles)
                        ->orderBy('g.name', 'ASC')
                        ->addOrderBy('s.name', 'ASC');
                    
                    return $qb;
                },
            ]);
    }

    private function getUser()
    {
        $token = $this->tokenStorage->getToken();
        return $token ? $token->getUser() : null;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Picture::class,
        ]);
    }
}